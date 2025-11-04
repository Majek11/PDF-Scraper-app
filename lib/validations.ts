import { z } from "zod"

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

// Enums as per specification
export const EmploymentType = z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"])
export const LocationType = z.enum(["ONSITE", "REMOTE", "HYBRID"])
export const DegreeType = z.enum(["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "DOCTORATE"])
export const LanguageLevel = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "NATIVE"])

// Resume data schema matching the exact specification
export const resumeDataSchema = z.object({
  profile: z.object({
    name: z.string(),
    surname: z.string(),
    email: z.string().email().optional(),
    headline: z.string().optional(),
    professionalSummary: z.string().optional(),
    linkedIn: z.string().optional(),
    website: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    relocation: z.boolean().optional(),
    remote: z.boolean().optional(),
  }),
  workExperiences: z.array(
    z.object({
      jobTitle: z.string(),
      employmentType: EmploymentType.optional(),
      locationType: LocationType.optional(),
      company: z.string(),
      startMonth: z.number().min(1).max(12).optional(),
      startYear: z.number().optional(),
      endMonth: z.number().min(1).max(12).nullable().optional(),
      endYear: z.number().nullable().optional(),
      current: z.boolean().optional(),
      description: z.string().optional(),
    })
  ).optional().default([]),
  educations: z.array(
    z.object({
      school: z.string(),
      degree: DegreeType.optional(),
      major: z.string().optional(),
      startYear: z.number().optional(),
      endYear: z.number().optional(),
      current: z.boolean().optional(),
      description: z.string().optional(),
    })
  ).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  licenses: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().optional(),
      issueYear: z.number().optional(),
      description: z.string().optional(),
    })
  ).optional().default([]),
  languages: z.array(
    z.object({
      language: z.string(),
      level: LanguageLevel.optional(),
    })
  ).optional().default([]),
  achievements: z.array(
    z.object({
      title: z.string(),
      organization: z.string().optional(),
      achieveDate: z.string().optional(),
      description: z.string().optional(),
    })
  ).optional().default([]),
  publications: z.array(
    z.object({
      title: z.string(),
      publisher: z.string().optional(),
      publicationDate: z.string().optional(),
      publicationUrl: z.string().optional(),
      description: z.string().optional(),
    })
  ).optional().default([]),
  honors: z.array(
    z.object({
      title: z.string(),
      issuer: z.string().optional(),
      issueMonth: z.number().min(1).max(12).optional(),
      issueYear: z.number().optional(),
      description: z.string().optional(),
    })
  ).optional().default([]),
})

export type ResumeData = z.infer<typeof resumeDataSchema>
export type EmploymentType = z.infer<typeof EmploymentType>
export type LocationType = z.infer<typeof LocationType>
export type DegreeType = z.infer<typeof DegreeType>
export type LanguageLevel = z.infer<typeof LanguageLevel>
