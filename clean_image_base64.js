const fs = require("fs");
const path = require("path");

// Adjust this path as needed for your deployment
const DB_PATH = "/opt/render/project/src/public/data/art_database.json";

// Pattern to match "data:image/jpeg;base64,<actual_base64_data>"
const prefixRegex = /^data:(image\/[a-zA-Z]+);base64,(.+)$/;

try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const db = JSON.parse(raw);

    let modified = false;

    db.records.forEach((record, index) => {
        if (typeof record.imageBase64 === "string") {
            const match = record.imageBase64.match(prefixRegex);
            if (match) {
                const mimeType = match[1];
                const base64Data = match[2];

                record.imageBase64 = base64Data;
                record.imageMimeType = mimeType;
                modified = true;

                console.log(`✔️ Cleaned record ID ${record.recordId || index}: extracted ${mimeType}`);
            }
        }
    });

    if (modified) {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        console.log("\n✅ Database updated successfully with raw Base64 and extracted MIME types.");
    } else {
        console.log("✅ No changes needed. All records already clean.");
    }
} catch (error) {
    console.error("❌ Error during cleanup:", error.message);
}
