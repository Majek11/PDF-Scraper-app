import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { signUpSchema } from "@/lib/validations"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = signUpSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.errors }, { status: 400 })
    }

    const { email, password } = validation.data

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with 200 free credits
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        credits: 200,
        planType: "FREE",
      },
    })

    return NextResponse.json({ message: "User created successfully", userId: user.id }, { status: 201 })
  } catch (error) {
    console.error("[SIGNUP_ERROR]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
