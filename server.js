```javascript
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");

const app = express();

app.use(express.json());


// =====================================================
// MONGODB
// =====================================================

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
    console.error("FEHLER: MONGODB_URI ist nicht gesetzt.");
    process.exit(1);
}

const client = new MongoClient(mongoUri);

let db;
let benutzerCollection;
let projekteCollection;


// =====================================================
// MONGODB VERBINDEN
// =====================================================

async function connectDatabase() {

    try {

        await client.connect();

        db = client.db("Buero");

        benutzerCollection =
            db.collection("benutzer");

        projekteCollection =
            db.collection("projekte");

        console.log("=================================");
        console.log("MongoDB erfolgreich verbunden.");
        console.log("Datenbank: Buero");
        console.log("Collection: benutzer");
        console.log("Collection: projekte");
        console.log("=================================");

    }
    catch (error) {

        console.error(
            "MongoDB-Verbindung fehlgeschlagen:"
        );

        console.error(error);

        process.exit(1);
    }
}


// =====================================================
// TEST
// =====================================================

app.get("/", (req, res) => {

    res.json({
        status: "ok",
        message: "Büro-Server läuft"
    });

});


// =====================================================
// ALLE BENUTZER
// =====================================================

app.get("/api/benutzer", async (req, res) => {

    try {

        const benutzer =
            await benutzerCollection
                .find({})
                .project({
                    passwort: 0
                })
                .toArray();

        res.json(benutzer);

    }
    catch (error) {

        console.error(
            "Fehler beim Laden der Benutzer:"
        );

        console.error(error);

        res.status(500).json({
            error: "Benutzer konnten nicht geladen werden."
        });

    }

});


// =====================================================
// NEUEN BENUTZER ERSTELLEN
// =====================================================

app.post("/api/benutzer", async (req, res) => {

    try {

        const {
            name,
            passwort,
            rolle
        } = req.body;


        if (!name || !passwort || !rolle) {

            return res.status(400).json({
                error:
                    "Name, Passwort und Rolle sind erforderlich."
            });

        }


        if (
            rolle !== "admin" &&
            rolle !== "mitarbeiter"
        ) {

            return res.status(400).json({
                error: "Ungültige Rolle."
            });

        }


        const vorhandenerBenutzer =
            await benutzerCollection.findOne({
                name: name
            });


        if (vorhandenerBenutzer) {

            return res.status(409).json({
                error:
                    "Dieser Benutzer existiert bereits."
            });

        }


        const passwortHash =
            await bcrypt.hash(
                passwort,
                12
            );


        const neuerBenutzer = {

            name: name,

            passwort: passwortHash,

            rolle: rolle,

            erstelltAm: new Date()

        };


        const result =
            await benutzerCollection.insertOne(
                neuerBenutzer
            );


        res.status(201).json({

            message:
                "Benutzer erfolgreich erstellt.",

            id:
                result.insertedId

        });

    }
    catch (error) {

        console.error(
            "Fehler beim Erstellen des Benutzers:"
        );

        console.error(error);

        res.status(500).json({
            error:
                "Benutzer konnte nicht erstellt werden."
        });

    }

});


// =====================================================
// BENUTZER BEARBEITEN
// =====================================================

app.put("/api/benutzer/:id", async (req, res) => {

    try {

        const id =
            req.params.id;


        if (!ObjectId.isValid(id)) {

            return res.status(400).json({
                error:
                    "Ungültige Benutzer-ID."
            });

        }


        const {
            name,
            passwort,
            rolle
        } = req.body;


        const aenderungen = {};


        if (name) {

            aenderungen.name =
                name;

        }


        if (rolle) {

            if (
                rolle !== "admin" &&
                rolle !== "mitarbeiter"
            ) {

                return res.status(400).json({
                    error:
                        "Ungültige Rolle."
                });

            }

            aenderungen.rolle =
                rolle;

        }


        if (passwort) {

            aenderungen.passwort =
                await bcrypt.hash(
                    passwort,
                    12
                );

        }


        if (
            Object.keys(aenderungen).length === 0
        ) {

            return res.status(400).json({
                error:
                    "Keine Änderungen angegeben."
            });

        }


        const result =
            await benutzerCollection.updateOne(

                {
                    _id:
                        new ObjectId(id)
                },

                {
                    $set:
                        aenderungen
                }

            );


        if (result.matchedCount === 0) {

            return res.status(404).json({
                error:
                    "Benutzer nicht gefunden."
            });

        }


        res.json({
            message:
                "Benutzer erfolgreich geändert."
        });

    }
    catch (error) {

        console.error(
            "Fehler beim Bearbeiten des Benutzers:"
        );

        console.error(error);

        res.status(500).json({
            error:
                "Benutzer konnte nicht geändert werden."
        });

    }

});


// =====================================================
// BENUTZER LÖSCHEN
// =====================================================

app.delete("/api/benutzer/:id", async (req, res) => {

    try {

        const id =
            req.params.id;


        if (!ObjectId.isValid(id)) {

            return res.status(400).json({
                error:
                    "Ungültige Benutzer-ID."
            });

        }


        const result =
            await benutzerCollection.deleteOne({

                _id:
                    new ObjectId(id)

            });


        if (result.deletedCount === 0) {

            return res.status(404).json({
                error:
                    "Benutzer nicht gefunden."
            });

        }


        res.json({
            message:
                "Benutzer erfolgreich gelöscht."
        });

    }
    catch (error) {

        console.error(
            "Fehler beim Löschen des Benutzers:"
        );

        console.error(error);

        res.status(500).json({
            error:
                "Benutzer konnte nicht gelöscht werden."
        });

    }

});


// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {

    try {

        const {
            name,
            passwort
        } = req.body;


        if (!name || !passwort) {

            return res.status(400).json({
                error:
                    "Name und Passwort sind erforderlich."
            });

        }


        const benutzer =
            await benutzerCollection.findOne({
                name: name
            });


        if (!benutzer) {

            return res.status(401).json({
                error:
                    "Benutzername oder Passwort falsch."
            });

        }


        const passwortRichtig =
            await bcrypt.compare(
                passwort,
                benutzer.passwort
            );


        if (!passwortRichtig) {

            return res.status(401).json({
                error:
                    "Benutzername oder Passwort falsch."
            });

        }


        res.json({

            message:
                "Login erfolgreich.",

            id:
                benutzer._id,

            name:
                benutzer.name,

            rolle:
                benutzer.rolle

        });

    }
    catch (error) {

        console.error(
            "Login-Fehler:"
        );

        console.error(error);

        res.status(500).json({
            error:
                "Login konnte nicht durchgeführt werden."
        });

    }

});


// =====================================================
// PROJEKT NACH NUMMER SUCHEN
// =====================================================

app.get("/api/projekte/:nummer", async (req, res) => {

    try {

        const nummer =
            String(
                req.params.nummer
            ).trim();


        console.log(
            "---------------------------------"
        );

        console.log(
            "Projekt-Suche:"
        );

        console.log(
            "Gesuchte Nummer:",
            nummer
        );


        if (!nummer) {

            return res.status(400).json({
                error:
                    "Projektnummer fehlt."
            });

        }


        // =================================================
        // ZUERST ALS STRING SUCHEN
        // =================================================

        let projekt =
            await projekteCollection.findOne({

                projektnummer:
                    nummer

            });


        // =================================================
        // FALLS NICHT GEFUNDEN:
        // ALS ZAHL SUCHEN
        // =================================================

        if (!projekt) {

            const nummerAlsZahl =
                Number(nummer);


            if (!Number.isNaN(nummerAlsZahl)) {

                projekt =
                    await projekteCollection.findOne({

                        projektnummer:
                            nummerAlsZahl

                    });

            }

        }


        // =================================================
        // NICHT GEFUNDEN
        // =================================================

        if (!projekt) {

            console.log(
                "Projekt NICHT gefunden:"
            );

            console.log(
                "Nummer:",
                nummer
            );

            console.log(
                "---------------------------------"
            );

            return res.status(404).json({

                error:
                    "Projekt nicht gefunden.",

                projektnummer:
                    nummer

            });

        }


        // =================================================
        // GEFUNDEN
        // =================================================

        console.log(
            "Projekt gefunden:"
        );

        console.log(
            projekt
        );

        console.log(
            "---------------------------------"
        );


        res.json(projekt);

    }
    catch (error) {

        console.error(
            "Fehler bei der Projektsuche:"
        );

        console.error(error);

        res.status(500).json({

            error:
                "Projekt konnte nicht geladen werden."

        });

    }

});


// =====================================================
// ALLE PROJEKTE
// =====================================================

app.get("/api/projekte", async (req, res) => {

    try {

        const projekte =
            await projekteCollection
                .find({})
                .sort({
                    datum: -1
                })
                .toArray();


        res.json(projekte);

    }
    catch (error) {

        console.error(
            "Fehler beim Laden aller Projekte:"
        );

        console.error(error);

        res.status(500).json({

            error:
                "Projekte konnten nicht geladen werden."

        });

    }

});


// =====================================================
// NEUES PROJEKT
// =====================================================

app.post("/api/projekte", async (req, res) => {

    try {

        const projekt =
            req.body;


        if (!projekt.projektnummer) {

            return res.status(400).json({

                error:
                    "Projektnummer ist erforderlich."

            });

        }


        const projektnummer =
            String(
                projekt.projektnummer
            ).trim();


        // Prüfen, ob Nummer bereits existiert
        const vorhanden =
            await projekteCollection.findOne({

                $or: [

                    {
                        projektnummer:
                            projektnummer
                    },

                    {
                        projektnummer:
                            Number(projektnummer)
                    }

                ]

            });


        if (vorhanden) {

            return res.status(409).json({

                error:
                    "Diese Projektnummer existiert bereits."

            });

        }


        const neuesProjekt = {

            ...projekt,

            projektnummer:
                projektnummer,

            erstelltAm:
                new Date()

        };


        const result =
            await projekteCollection.insertOne(
                neuesProjekt
            );


        res.status(201).json({

            message:
                "Projekt erfolgreich erstellt.",

            id:
                result.insertedId,

            projekt:
                neuesProjekt

        });

    }
    catch (error) {

        console.error(
            "Fehler beim Erstellen des Projekts:"
        );

        console.error(error);

        res.status(500).json({

            error:
                "Projekt konnte nicht erstellt werden."

        });

    }

});


// =====================================================
// SERVER STARTEN
// =====================================================

async function startServer() {

    try {

        await connectDatabase();


        const PORT =
            process.env.PORT || 3000;


        app.listen(
            PORT,
            () => {

                console.log(
                    "================================="
                );

                console.log(
                    `Büro-Server läuft auf Port ${PORT}`
                );

                console.log(
                    "================================="
                );

            }
        );

    }
    catch (error) {

        console.error(
            "Server konnte nicht gestartet werden:"
        );

        console.error(error);

        process.exit(1);

    }

}


startServer();
```

**Wichtig:** Dieser Server sucht jetzt bei `/api/projekte/12345` zuerst nach `projektnummer: "12345"` und danach nach `projektnummer: 12345`. Damit sollte dein bestehender Qt-Suchcode funktionieren, solange das Projekt tatsächlich in der Collection `projekte` vorhanden ist.

Nach dem Deploy kannst du zuerst diese beiden URLs testen:

* `https://buero-server.onrender.com/`
* `https://buero-server.onrender.com/api/projekte/DEINE_NUMMER`

Wenn die zweite weiterhin `Projekt nicht gefunden` meldet, liegt es sehr wahrscheinlich an den vorhandenen MongoDB-Daten. Ich kann dir dann auch den **Projekt-Anlegen-Code (`NeuPro`) passend zu diesem Server neu schreiben**, damit neue Projekte garantiert richtig in MongoDB gespeichert werden.
