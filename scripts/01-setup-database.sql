-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Resume table
CREATE TABLE IF NOT EXISTS "Resume" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "filePath" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  "extractedData" JSONB,
  error TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "Resume_userId_idx" ON "Resume"("userId");
CREATE INDEX IF NOT EXISTS "Resume_status_idx" ON "Resume"("status");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_updated_at ON "User";
CREATE TRIGGER update_user_updated_at
  BEFORE UPDATE ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resume_updated_at ON "Resume";
CREATE TRIGGER update_resume_updated_at
  BEFORE UPDATE ON "Resume"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
