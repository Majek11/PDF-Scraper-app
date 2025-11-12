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
    email: z.string().email().nullable().optional(),
    headline: z.string().nullable().optional(),
    professionalSummary: z.string().nullable().optional(),
    linkedIn: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    relocation: z.boolean().nullable().optional(),
    remote: z.boolean().nullable().optional(),
  }),
  workExperiences: z.array(
    z.object({
      jobTitle: z.string(),
      employmentType: EmploymentType.nullable().optional(),
      locationType: LocationType.nullable().optional(),
      company: z.string(),
      startMonth: z.number().min(1).max(12).nullable().optional(),
      startYear: z.number().nullable().optional(),
      endMonth: z.number().min(1).max(12).nullable().optional(),
      endYear: z.number().nullable().optional(),
      current: z.boolean().nullable().optional(),
      description: z.string().nullable().optional(),
    })
  ).optional().default([]),
  educations: z.array(
    z.object({
      school: z.string(),
      degree: DegreeType.nullable().optional(),
      major: z.string().nullable().optional(),
      startYear: z.number().nullable().optional(),
      endYear: z.number().nullable().optional(),
      current: z.boolean().nullable().optional(),
      description: z.string().nullable().optional(),
    })
  ).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  licenses: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().nullable().optional(),
      issueYear: z.number().nullable().optional(),
      description: z.string().nullable().optional(),
    })
  ).optional().default([]),
  languages: z.array(
    z.object({
      language: z.string(),
      level: LanguageLevel.nullable().optional(),
    })
  ).optional().default([]),
  achievements: z.array(
    z.object({
      title: z.string(),
      organization: z.string().nullable().optional(),
      achieveDate: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    })
  ).optional().default([]),
  publications: z.array(
    z.object({
      title: z.string(),
      publisher: z.string().nullable().optional(),
      publicationDate: z.string().nullable().optional(),
      publicationUrl: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    })
  ).optional().default([]),
  honors: z.array(
    z.object({
      title: z.string(),
      issuer: z.string().nullable().optional(),
      issueMonth: z.number().min(1).max(12).nullable().optional(),
      issueYear: z.number().nullable().optional(),
      description: z.string().nullable().optional(),
    })
  ).optional().default([]),
})

export type ResumeData = z.infer<typeof resumeDataSchema>
export type EmploymentType = z.infer<typeof EmploymentType>
export type LocationType = z.infer<typeof LocationType>
export type DegreeType = z.infer<typeof DegreeType>
export type LanguageLevel = z.infer<typeof LanguageLevel>
