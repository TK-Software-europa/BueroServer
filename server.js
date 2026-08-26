const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");

const app = express();

app.use(express.json());

const mongoUri = process.env.MONGODB_URI;

const client = new MongoClient(mongoUri);

let db;
let benutzerCollection;


// ===============================
// MongoDB verbinden
// ===============================

async function connectDatabase() {
    try {
        await client.connect();

        db = client.db("Buero");
        benutzerCollection = db.collection("benutzer");

        console.log("MongoDB erfolgreich verbunden.");
    }
    catch (error) {
        console.error("MongoDB-Verbindung fehlgeschlagen:");
        console.error(error);
        process.exit(1);
    }
}


// ===============================
// Test
// ===============================

app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Büro-Server läuft"
    });
});


// ===============================
// ALLE BENUTZER
// ===============================

app.get("/api/benutzer", async (req, res) => {

    try {

        const benutzer = await benutzerCollection
            .find({})
            .project({ passwort: 0 })
            .toArray();

        res.json(benutzer);

    }
    catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Benutzer konnten nicht geladen werden."
        });
    }
});


// ===============================
// NEUEN BENUTZER ERSTELLEN
// ===============================

app.post("/api/benutzer", async (req, res) => {

    try {

        const { name, passwort, rolle } = req.body;

        if (!name || !passwort || !rolle) {
            return res.status(400).json({
                error: "Name, Passwort und Rolle sind erforderlich."
            });
        }

        if (rolle !== "admin" && rolle !== "mitarbeiter") {
            return res.status(400).json({
                error: "Ungültige Rolle."
            });
        }

        const vorhandenerBenutzer =
            await benutzerCollection.findOne({ name: name });

        if (vorhandenerBenutzer) {
            return res.status(409).json({
                error: "Dieser Benutzer existiert bereits."
            });
        }

        const passwortHash =
            await bcrypt.hash(passwort, 12);

        const neuerBenutzer = {
            name: name,
            passwort: passwortHash,
            rolle: rolle,
            erstelltAm: new Date()
        };

        const result =
            await benutzerCollection.insertOne(neuerBenutzer);

        res.status(201).json({
            message: "Benutzer erfolgreich erstellt.",
            id: result.insertedId
        });

    }
    catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Benutzer konnte nicht erstellt werden."
        });
    }
});


// ===============================
// BENUTZER BEARBEITEN
// ===============================

app.put("/api/benutzer/:id", async (req, res) => {

    try {

        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Ungültige Benutzer-ID."
            });
        }

        const { name, passwort, rolle } = req.body;

        const aenderungen = {};

        if (name) {
            aenderungen.name = name;
        }

        if (rolle) {

            if (rolle !== "admin" && rolle !== "mitarbeiter") {
                return res.status(400).json({
                    error: "Ungültige Rolle."
                });
            }

            aenderungen.rolle = rolle;
        }

        if (passwort) {

            aenderungen.passwort =
                await bcrypt.hash(passwort, 12);
        }

        if (Object.keys(aenderungen).length === 0) {
            return res.status(400).json({
                error: "Keine Änderungen angegeben."
            });
        }

        const result =
            await benutzerCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: aenderungen }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: "Benutzer nicht gefunden."
            });
        }

        res.json({
            message: "Benutzer erfolgreich geändert."
        });

    }
    catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Benutzer konnte nicht geändert werden."
        });
    }
});


// ===============================
// BENUTZER LÖSCHEN
// ===============================

app.delete("/api/benutzer/:id", async (req, res) => {

    try {

        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Ungültige Benutzer-ID."
            });
        }

        const result =
            await benutzerCollection.deleteOne({
                _id: new ObjectId(id)
            });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: "Benutzer nicht gefunden."
            });
        }

        res.json({
            message: "Benutzer erfolgreich gelöscht."
        });

    }
    catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Benutzer konnte nicht gelöscht werden."
        });
    }
});


// ===============================
// SERVER STARTEN
// ===============================

async function startServer() {

    await connectDatabase();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Büro-Server läuft auf Port ${PORT}`);
    });
}

startServer();