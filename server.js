const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

let db;

// MongoDB verbinden
async function connectDatabase() {
    try {
        if (!MONGODB_URI) {
            throw new Error("MONGODB_URI ist nicht gesetzt.");
        }

        const client = new MongoClient(MONGODB_URI);

        await client.connect();

        db = client.db("Buero");

        console.log("MongoDB erfolgreich verbunden.");
    } catch (error) {
        console.error("MongoDB-Verbindung fehlgeschlagen:");
        console.error(error);
        process.exit(1);
    }
}

// Start
async function startServer() {
    await connectDatabase();

    app.get("/", (req, res) => {
        res.json({
            status: "ok",
            message: "Büro-Server läuft",
            database: "verbunden"
        });
    });

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Büro-Server läuft auf Port ${PORT}`);
    });
}

startServer();
