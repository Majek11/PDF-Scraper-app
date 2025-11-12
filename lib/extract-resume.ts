import { prisma } from "./prisma"
import { resumeDataSchema } from "./validations"
import OpenAI from "openai"
import { execSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  return new OpenAI({ apiKey })
}

const SMALL_FILE_THRESHOLD = 4 * 1024 * 1024 // 4MB

// Retry helper for database operations with exponential backoff
async function updateResumeWithRetry(
  resumeId: string, 
  data: any, 
  maxRetries = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.resume.update({
        where: { id: resumeId },
        data,
      })
      return // Success
    } catch (error: any) {
      const isNetworkError = error?.code === 'P1001' || error?.message?.includes("Can't reach database")
      
      if (isNetworkError && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
        console.warn(`[DB_RETRY] Attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } else {
        throw error // Give up or non-retryable error
      }
    }
  }
}

// Normalization helpers to make AI output schema-friendly
const EmploymentTypeValues = new Set(["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"])
const LocationTypeValues = new Set(["ONSITE", "REMOTE", "HYBRID"])
const DegreeTypeValues = new Set(["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE"])
const LanguageLevelValues = new Set(["BEGINNER", "INTERMEDIATE", "ADVANCED", "NATIVE"])

function cleanString(val: any): string | undefined {
  if (typeof val !== "string") return undefined
  const t = val.trim()
  return t === "" ? undefined : t
}

function isValidEmail(s?: string): boolean {
  if (!s) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function normalizeEnum(val: any, allowed: Set<string>): string | undefined {
  if (typeof val !== "string") return undefined
  let t = val.trim()
  if (!t) return undefined
  t = t.toUpperCase().replace(/[\s-]+/g, "_")
  return allowed.has(t) ? t : undefined
}

function normalizeBoolean(val: any): boolean | undefined {
  if (typeof val === "boolean") return val
  if (typeof val === "string") {
    const t = val.trim().toLowerCase()
    if (t === "") return undefined
    if (["true", "yes", "y", "1"].includes(t)) return true
    if (["false", "no", "n", "0"].includes(t)) return false
  }
  return undefined
}

function num(val: any): number | undefined {
  if (val === null || val === undefined || val === "") return undefined
  const n = Number(val)
  return Number.isFinite(n) ? n : undefined
}

function clampMonth(n?: number): number | undefined {
  if (typeof n !== "number") return undefined
  if (n < 1 || n > 12) return undefined
  return n
}

function normalizeExtractedData(data: any): any {
  if (!data || typeof data !== "object") return data

  const profileIn = data.profile || {}
  const name = (typeof profileIn.name === "string" ? profileIn.name : "").trim()
  const surname = (typeof profileIn.surname === "string" ? profileIn.surname : "").trim()
  const emailStr = cleanString(profileIn.email)

  const profile = {
    name,
    surname,
    email: isValidEmail(emailStr) ? emailStr : undefined,
    headline: cleanString(profileIn.headline),
    professionalSummary: cleanString(profileIn.professionalSummary),
    linkedIn: cleanString(profileIn.linkedIn),
    website: cleanString(profileIn.website),
    country: cleanString(profileIn.country),
    city: cleanString(profileIn.city),
    relocation: normalizeBoolean(profileIn.relocation),
    remote: normalizeBoolean(profileIn.remote),
  }

  const workExperiencesIn = Array.isArray(data.workExperiences) ? data.workExperiences : []
  const workExperiences = workExperiencesIn.map((w: any) => {
    const jobTitle = (typeof w?.jobTitle === "string" ? w.jobTitle : "").trim()
    const company = (typeof w?.company === "string" ? w.company : "").trim()
    const employmentType = normalizeEnum(w?.employmentType, EmploymentTypeValues)
    const locationType = normalizeEnum(w?.locationType, LocationTypeValues)
    const startMonth = clampMonth(num(w?.startMonth))
    const startYear = num(w?.startYear)
    const endMonth = clampMonth(num(w?.endMonth))
    const endYear = num(w?.endYear)
    const current = normalizeBoolean(w?.current)
    const description = cleanString(w?.description)
    return {
      jobTitle,
      employmentType,
      locationType,
      company,
      startMonth,
      startYear,
      endMonth,
      endYear,
      current,
      description,
    }
  })

  const educationsIn = Array.isArray(data.educations) ? data.educations : []
  const educations = educationsIn.map((e: any) => {
    const school = (typeof e?.school === "string" ? e.school : "").trim()
    const degree = normalizeEnum(e?.degree, DegreeTypeValues)
    const major = cleanString(e?.major)
    const startYear = num(e?.startYear)
    const endYear = num(e?.endYear)
    const current = normalizeBoolean(e?.current)
    const description = cleanString(e?.description)
    return {
      school,
      degree,
      major,
      startYear,
      endYear,
      current,
      description,
    }
  })

  const skillsIn = Array.isArray(data.skills) ? data.skills : []
  const skills = skillsIn
    .map((s: any) => cleanString(s))
    .filter((s: string | undefined): s is string => !!s)

  const licensesIn = Array.isArray(data.licenses) ? data.licenses : []
  const licenses = licensesIn.map((l: any) => ({
    name: (typeof l?.name === "string" ? l.name : "").trim(),
    issuer: cleanString(l?.issuer),
    issueYear: num(l?.issueYear),
    description: cleanString(l?.description),
  }))

  const languagesIn = Array.isArray(data.languages) ? data.languages : []
  const languages = languagesIn.map((l: any) => ({
    language: (typeof l?.language === "string" ? l.language : "").trim(),
    level: normalizeEnum(l?.level, LanguageLevelValues),
  }))

  const achievementsIn = Array.isArray(data.achievements) ? data.achievements : []
  const achievements = achievementsIn.map((a: any) => ({
    title: (typeof a?.title === "string" ? a.title : "").trim(),
    organization: cleanString(a?.organization),
    achieveDate: cleanString(a?.achieveDate),
    description: cleanString(a?.description),
  }))

  const publicationsIn = Array.isArray(data.publications) ? data.publications : []
  const publications = publicationsIn.map((p: any) => ({
    title: (typeof p?.title === "string" ? p.title : "").trim(),
    publisher: cleanString(p?.publisher),
    publicationDate: cleanString(p?.publicationDate),
    publicationUrl: cleanString(p?.publicationUrl),
    description: cleanString(p?.description),
  }))

  const honorsIn = Array.isArray(data.honors) ? data.honors : []
  const honors = honorsIn.map((h: any) => ({
    title: (typeof h?.title === "string" ? h.title : "").trim(),
    issuer: cleanString(h?.issuer),
    issueMonth: clampMonth(num(h?.issueMonth)),
    issueYear: num(h?.issueYear),
    description: cleanString(h?.description),
  }))

  return {
    profile,
    workExperiences,
    educations,
    skills,
    licenses,
    languages,
    achievements,
    publications,
    honors,
  }
}

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

// Reliable PDF -> JPEG conversion using pdftoppm (poppler). No DOM / canvas required.
async function convertPdfToImages(pdfBuffer: Buffer): Promise<string[]> {
  // Create unique temp directory for this specific PDF to avoid conflicts
  const uniqueId = `resume-pdf-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), uniqueId))
  const pdfPath = path.join(tmpDir, "input.pdf")
  
  console.log(`[PDF_CONVERSION] Using temp dir: ${tmpDir}`)
  fs.writeFileSync(pdfPath, pdfBuffer)
  
  try {
    // Convert first 3 pages to JPEG at 200 DPI for good quality
    // Output to the temp directory to avoid file conflicts
    const outputPrefix = path.join(tmpDir, "page")
    execSync(`pdftoppm -jpeg -r 200 -f 1 -l 3 "${pdfPath}" "${outputPrefix}"`, { stdio: "ignore" })

    const images: string[] = []
    for (let i = 1; i <= 3; i++) {
      const imgPath = path.join(tmpDir, `page-${i}.jpg`)
      if (!fs.existsSync(imgPath)) {
        console.log(`[PDF_CONVERSION] Page ${i} not found, stopping`)
        break
      }
      const b64 = fs.readFileSync(imgPath).toString("base64")
      console.log(`[PDF_CONVERSION] Converted page ${i}, size: ${b64.length} chars`)
      images.push(b64)
    }
    
    console.log(`[PDF_CONVERSION] Successfully converted ${images.length} page(s)`)
    return images
  } catch (err) {
    console.error("[PDF_TO_IMAGE_ERROR]", err)
    throw new Error("Failed to convert PDF to images")
  } finally {
    // Clean up temp files
    try { 
      fs.rmSync(tmpDir, { recursive: true, force: true })
      console.log(`[PDF_CONVERSION] Cleaned up temp dir: ${tmpDir}`)
    } catch (cleanupErr) {
      console.warn(`[PDF_CONVERSION] Failed to cleanup ${tmpDir}:`, cleanupErr)
    }
  }
}

export async function extractResumeData(resumeId: string, pdfBuffer: Buffer, fileSize: number) {
  try {
    console.log(`\n========================================`)
    console.log(`[EXTRACTION] Starting extraction for resume ${resumeId}`)
    console.log(`[EXTRACTION] File size: ${fileSize} bytes`)
    console.log(`[EXTRACTION] Buffer hash: ${require('crypto').createHash('md5').update(pdfBuffer).digest('hex').substring(0, 8)}`)
    console.log(`========================================\n`)

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      throw new Error("OpenAI API key is not configured")
    }

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
      // Image-based PDF: Convert to images first, then use GPT-4 Vision
      console.log("[EXTRACTION] Converting PDF to images for Vision API")
      const images = await convertPdfToImages(pdfBuffer)
      console.log(`[EXTRACTION] Converted PDF to ${images.length} image(s)`)
      extractedData = await extractFromImages(images)
      console.log("[EXTRACTION] OpenAI Vision extraction complete")
    }

    // Validate extracted data
    console.log("[EXTRACTION] Validating extracted data...")
    const cleaned = normalizeExtractedData(extractedData)
    const validatedData = resumeDataSchema.parse(cleaned)

    console.log("[EXTRACTION] Data validated successfully")

    // Update resume record with retry logic for transient database errors
    await updateResumeWithRetry(resumeId, {
      extractedData: validatedData,
      status: "completed",
    })

    console.log(`[EXTRACTION] Resume ${resumeId} extraction completed successfully`)
    console.log(`========================================\n`)
  } catch (error: any) {
    console.error(`\n========================================`)
    console.error(`[EXTRACTION] Extraction failed for resume ${resumeId}`)
    console.error("[EXTRACTION] Error name:", error?.name)
    console.error("[EXTRACTION] Error message:", error?.message || error)
    console.error("[EXTRACTION] Error code:", error?.code)
    console.error("[EXTRACTION] Stack:", error?.stack)

    // Store error details in database for debugging (with retry)
    try {
      await updateResumeWithRetry(resumeId, { 
        status: "failed",
        extractedData: {
          error: error?.message || String(error),
          errorType: error?.name || "Unknown",
          timestamp: new Date().toISOString()
        }
      })
    } catch (dbError) {
      console.error("[EXTRACTION] Failed to update database with error status:", dbError)
    }

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
  
  console.log("[EXTRACTION] Calling OpenAI API...")
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

  console.log("[EXTRACTION] OpenAI API call successful")
  const content = response.choices[0].message.content
  if (!content) throw new Error("No response from OpenAI")

  // Remove markdown code blocks if present
  const jsonString = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim()

  return JSON.parse(jsonString)
}

async function extractFromImages(base64Images: string[]) {
  const prompt = `Extract structured data from this resume. The resume may span multiple images. Return ONLY valid JSON with no markdown formatting or code blocks.

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
  
  // Build content array with text prompt and all images
  const content: any[] = [
    {
      type: "text",
      text: prompt,
    }
  ]
  
  // Add all images
  for (const base64 of base64Images) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${base64}`,
        detail: "high"
      },
    })
  }

  console.log("[EXTRACTION] Calling OpenAI Vision API with", base64Images.length, "image(s)...")
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
        content: content,
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  })

  console.log("[EXTRACTION] OpenAI Vision API call successful")
  const responseContent = response.choices[0].message.content
  if (!responseContent) throw new Error("No response from OpenAI")

  // Remove markdown code blocks if present
  const jsonString = responseContent
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim()

  return JSON.parse(jsonString)
}
