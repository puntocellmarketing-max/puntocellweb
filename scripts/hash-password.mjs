import bcrypt from "bcryptjs";

const plain = process.argv[2];

if (!plain) {
  console.log("Uso: node scripts/hash-password.mjs TU_PASSWORD");
  process.exit(1);
}

const hash = await bcrypt.hash(plain, 10);
console.log(hash);