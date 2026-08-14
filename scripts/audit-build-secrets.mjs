import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const distDir = join(process.cwd(), "dist");
const ignoredExtensions = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".woff",
  ".woff2"
]);

const secretPatterns = [
  {
    label: "Supabase service-role key marker",
    pattern: /SUPABASE_SERVICE_ROLE_KEY|service_role/iu
  },
  {
    label: "Discord client secret marker",
    pattern: /DISCORD_CLIENT_SECRET|discord_client_secret/iu
  },
  {
    label: "Private key block",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/u
  },
  {
    label: "GitHub personal access token",
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/u
  },
  {
    label: "Slack token",
    pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/u
  },
  {
    label: "AWS access key",
    pattern: /AKIA[0-9A-Z]{16}/u
  },
  {
    label: "OpenAI API key",
    pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/u
  }
];

function getExtension(path) {
  const match = /\.[^.]+$/u.exec(path);
  return match ? match[0].toLowerCase() : "";
}

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return collectFiles(fullPath);
    }

    return [fullPath];
  });
}

if (!existsSync(distDir)) {
  console.error("dist does not exist. Run pnpm build before pnpm audit:secrets.");
  process.exit(1);
}

const findings = [];

for (const filePath of collectFiles(distDir)) {
  if (ignoredExtensions.has(getExtension(filePath))) {
    continue;
  }

  const contents = readFileSync(filePath, "utf8");

  for (const { label, pattern } of secretPatterns) {
    if (pattern.test(contents)) {
      findings.push(`${relative(process.cwd(), filePath)}: ${label}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Potential private secret material found in build output:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("No private secret markers found in build output.");
