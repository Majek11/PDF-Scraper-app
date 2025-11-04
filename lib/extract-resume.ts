import { prisma } from "./prisma"
import { resumeDataSchema } from "./validations"
import OpenAI from "openai"

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  return new OpenAI({ apiKey })
}

const SMALL_FILE_THRESHOLD = 4 * 1024 * 1024 // 4MB

async function parsePdf(buffer: Buffer): Promise<{ text: string }> {
  try {
    // Use pdf-parse with dynamic import - fallback to Vision if it fails
    const pdfParse = (await import("pdf-parse")).default
    const data = await pdfParse(buffer, { max: 0 })
    return { text: data.text || "" }
  } catch (error) {
    console.warn("[PDF_PARSE] Text extraction failed, will use Vision mode:", error instanceof Error ? error.message : error)
    // Return empty text to trigger Vision mode
    return { text: "" }
  }
}

export async function extractResumeData(resumeId: string, pdfBuffer: Buffer, fileSize: number) {
  try {
    console.log(`[EXTRACTION] Starting extraction for resume ${resumeId}, size: ${fileSize} bytes`)

    // Extract text from PDF
    console.log(`[EXTRACTION] Parsing PDF...`)
    const pdfData = await parsePdf(pdfBuffer)
    const extractedText = pdfData.text.trim()

    console.log(`[EXTRACTION] Extracted ${extractedText.length} characters from PDF`)

    // Detect if PDF is text-based or image-based
    const isTextBased = extractedText.length > 100
    const isSmallFile = fileSize < SMALL_FILE_THRESHOLD

    console.log(
      `[EXTRACTION] PDF type: ${isTextBased ? "text-based" : "image-based"}, size category: ${isSmallFile ? "small" : "large"}`,
    )

    let extractedData

    if (isTextBased) {
      // Text-based PDF: Use GPT-4 with text extraction
      console.log("[EXTRACTION] Using GPT-4 for text-based extraction")
      extractedData = await extractFromText(extractedText)
      console.log("[EXTRACTION] OpenAI extraction complete")
    } else {
      // Image-based PDF: Use GPT-4 Vision
      console.log("[EXTRACTION] Using GPT-4 Vision for image-based extraction")
      const base64Pdf = pdfBuffer.toString("base64")
      extractedData = await extractFromImage(base64Pdf)
      console.log("[EXTRACTION] OpenAI Vision extraction complete")
    }

    // Validate extracted data
    console.log("[EXTRACTION] Validating extracted data...")
    const validatedData = resumeDataSchema.parse(extractedData)

    console.log("[EXTRACTION] Data validated successfully")

    // Update resume record
    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        extractedData: validatedData,
        status: "completed",
      },
    })

    console.log(`[EXTRACTION] Resume ${resumeId} extraction completed successfully`)
  } catch (error: any) {
    console.error("[EXTRACTION] Extraction failed for resume", resumeId)
    console.error("[EXTRACTION] Error:", error?.message || error)
    console.error("[EXTRACTION] Stack:", error?.stack)

    await prisma.resume.update({
      where: { id: resumeId },
      data: { status: "failed" },
    })

    throw error
  }
}

async function extractFromText(text: string) {
  const prompt = `Extract structured data from this resume text. Return ONLY valid JSON with no markdown formatting or code blocks.

Required JSON structure (follow EXACTLY):
{
  "profile": {
    "name": "string",
    "surname": "string",
    "email": "string (optional)",
    "headline": "string (professional title/role, optional)",
    "professionalSummary": "string (optional)",
    "linkedIn": "string (LinkedIn URL, optional)",
    "website": "string (personal website, optional)",
    "country": "string (optional)",
    "city": "string (optional)",
    "relocation": boolean (optional),
    "remote": boolean (optional)
  },
  "workExperiences": [
    {
      "jobTitle": "string",
      "employmentType": "FULL_TIME | PART_TIME | INTERNSHIP | CONTRACT (optional)",
      "locationType": "ONSITE | REMOTE | HYBRID (optional)",
      "company": "string",
      "startMonth": number (1-12, optional),
      "startYear": number (optional),
      "endMonth": number or null (1-12, optional),
      "endYear": number or null (optional),
      "current": boolean (optional),
      "description": "string (optional)"
    }
  ],
  "educations": [
    {
      "school": "string",
      "degree": "HIGH_SCHOOL | ASSOCIATE | BACHELOR | MASTER | DOCTORATE (optional)",
      "major": "string (field of study, optional)",
      "startYear": number (optional),
      "endYear": number (optional),
      "current": boolean (optional),
      "description": "string (optional)"
    }
  ],
  "skills": ["string", ...],
  "licenses": [
    {
      "name": "string",
      "issuer": "string (optional)",
      "issueYear": number (optional),
      "description": "string (optional)"
    }
  ],
  "languages": [
    {
      "language": "string",
      "level": "BEGINNER | INTERMEDIATE | ADVANCED | NATIVE (optional)"
    }
  ],
  "achievements": [
    {
      "title": "string",
      "organization": "string (optional)",
      "achieveDate": "string (YYYY-MM format, optional)",
      "description": "string (optional)"
    }
  ],
  "publications": [
    {
      "title": "string",
      "publisher": "string (optional)",
      "publicationDate": "string (ISO 8601 date, optional)",
      "publicationUrl": "string (optional)",
      "description": "string (optional)"
    }
  ],
  "honors": [
    {
      "title": "string",
      "issuer": "string (optional)",
      "issueMonth": number (1-12, optional),
      "issueYear": number (optional)",
      "description": "string (optional)"
    }
  ]
}

Resume text:
${text}

Return only the JSON object, no other text.`

  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a resume data extraction expert. Extract structured data and return only valid JSON matching the exact schema provided.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.1,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error("No response from OpenAI")

  // Remove markdown code blocks if present
  const jsonString = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim()

  return JSON.parse(jsonString)
}

async function extractFromImage(base64Pdf: string) {
  const prompt = `Extract structured data from this resume PDF image. Return ONLY valid JSON with no markdown formatting or code blocks.

Required JSON structure (follow EXACTLY):
{
  "profile": {
    "name": "string",
    "surname": "string",
    "email": "string (optional)",
    "headline": "string (professional title/role, optional)",
    "professionalSummary": "string (optional)",
    "linkedIn": "string (LinkedIn URL, optional)",
    "website": "string (personal website, optional)",
    "country": "string (optional)",
    "city": "string (optional)",
    "relocation": boolean (optional),
    "remote": boolean (optional)
  },
  "workExperiences": [
    {
      "jobTitle": "string",
      "employmentType": "FULL_TIME | PART_TIME | INTERNSHIP | CONTRACT (optional)",
      "locationType": "ONSITE | REMOTE | HYBRID (optional)",
      "company": "string",
      "startMonth": number (1-12, optional),
      "startYear": number (optional),
      "endMonth": number or null (1-12, optional),
      "endYear": number or null (optional),
      "current": boolean (optional),
      "description": "string (optional)"
    }
  ],
  "educations": [
    {
      "school": "string",
      "degree": "HIGH_SCHOOL | ASSOCIATE | BACHELOR | MASTER | DOCTORATE (optional)",
      "major": "string (field of study, optional)",
      "startYear": number (optional),
      "endYear": number (optional),
      "current": boolean (optional)",
      "description": "string (optional)"
    }
  ],
  "skills": ["string", ...],
  "licenses": [
    {
      "name": "string",
      "issuer": "string (optional)",
      "issueYear": number (optional)",
      "description": "string (optional)"
    }
  ],
  "languages": [
    {
      "language": "string",
      "level": "BEGINNER | INTERMEDIATE | ADVANCED | NATIVE (optional)"
    }
  ],
  "achievements": [
    {
      "title": "string",
      "organization": "string (optional)",
      "achieveDate": "string (YYYY-MM format, optional)",
      "description": "string (optional)"
    }
  ],
  "publications": [
    {
      "title": "string",
      "publisher": "string (optional)",
      "publicationDate": "string (ISO 8601 date, optional)",
      "publicationUrl": "string (optional)",
      "description": "string (optional)"
    }
  ],
  "honors": [
    {
      "title": "string",
      "issuer": "string (optional)",
      "issueMonth": number (1-12, optional),
      "issueYear": number (optional)",
      "description": "string (optional)"
    }
  ]
}

Return only the JSON object, no other text.`

  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a resume data extraction expert. Extract structured data from images and return only valid JSON matching the exact schema provided.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:application/pdf;base64,${base64Pdf}`,
            },
          },
        ],
      },
    ],
    temperature: 0.1,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error("No response from OpenAI")

  // Remove markdown code blocks if present
  const jsonString = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim()

  return JSON.parse(jsonString)
}
