const pc = require("picocolors");
const process = require("process");
const filePaths = [];
async function main() {
    for (const [i, filePath] of filePaths.entries()) {
        if (i > 0) {
            console.log("");
        }
        const esmPath = "./esm/" + filePath;
        console.log("\nRunning tests in " + pc.underline(esmPath) + "...\n");
        process.chdir(__dirname + "/esm");
        await import(esmPath);
    }
}
main();
