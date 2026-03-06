const MOCK_INFECTED = [Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")];

async function scanBuffer(fileBuffer, filename) {
  await new Promise((res) => setTimeout(res, 80));
  for (const sig of MOCK_INFECTED) {
    if (fileBuffer.includes(sig)) return { clean: false, threat: "EICAR.Test.File" };
  }
  return { clean: true, threat: null };
}

module.exports = { scanBuffer };