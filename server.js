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
    console.error("MONGODB_URI fehlt.");
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

        console.log("---------------------------------");
        console.log("MongoDB erfolgreich verbunden.");
        console.log("Datenbank: Buero");
        console.log("Collection: benutzer");
        console.log("Collection: projekte");
        console.log("---------------------------------");

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
            error:
                "Benutzer konnten nicht geladen werden."
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
                error:
                    "Ungültige Rolle."
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
// ALLE PROJEKTE
// =====================================================

app.get("/api/projekte", async (req, res) => {

    try {

        console.log(
            "Alle Projekte werden geladen."
        );


        const projekte =
            await projekteCollection
                .find({})
                .sort({
                    erstelltAm: -1
                })
                .toArray();


        console.log(
            "Anzahl Projekte:",
            projekte.length
        );


        res.json(projekte);

    }
    catch (error) {

        console.error(
            "Fehler beim Laden der Projekte:"
        );

        console.error(error);

        res.status(500).json({

            error:
                "Projekte konnten nicht geladen werden."

        });
    }
});


// =====================================================
// PROJEKT SUCHEN
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
            "Projektsuche:"
        );

        console.log(
            "Nummer:",
            nummer
        );


        if (!nummer) {

            return res.status(400).json({
                error:
                    "Projektnummer fehlt."
            });
        }


        // ---------------------------------------------
        // Als String suchen
        // ---------------------------------------------

        let projekt =
            await projekteCollection.findOne({

                projektnummer:
                    nummer

            });


        // ---------------------------------------------
        // Falls alte Daten als Zahl gespeichert sind
        // ---------------------------------------------

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


        // ---------------------------------------------
        // Nicht gefunden
        // ---------------------------------------------

        if (!projekt) {

            console.log(
                "Projekt nicht gefunden:",
                nummer
            );

            console.log(
                "---------------------------------"
            );


            return res.status(404).json({

                error:
                    "Projekt nicht gefunden."

            });
        }


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
// PROJEKT ERSTELLEN
// =====================================================

app.post("/api/projekte", async (req, res) => {

    try {

        console.log(
            "---------------------------------"
        );

        console.log(
            "Neues Projekt wird gespeichert."
        );

        console.log(
            "Empfangene Daten:"
        );

        console.log(
            req.body
        );


        const {
            projektnummer,
            titel,
            beschreibung,
            anmerkung,
            datum,
            inArbeit,
            fertig,
            wartung
        } = req.body;


        // ---------------------------------------------
        // Projektnummer prüfen
        // ---------------------------------------------

        if (
            projektnummer === undefined ||
            projektnummer === null ||
            String(projektnummer).trim() === ""
        ) {

            return res.status(400).json({

                error:
                    "Projektnummer fehlt."

            });
        }


        // ---------------------------------------------
        // Titel prüfen
        // ---------------------------------------------

        if (
            titel === undefined ||
            titel === null ||
            String(titel).trim() === ""
        ) {

            return res.status(400).json({

                error:
                    "Projekttitel fehlt."

            });
        }


        const nummer =
            String(
                projektnummer
            ).trim();


        // ---------------------------------------------
        // Prüfen ob Projekt existiert
        // ---------------------------------------------

        let vorhandenesProjekt =
            await projekteCollection.findOne({

                projektnummer:
                    nummer

            });


        // Alte Projekte als Zahl berücksichtigen
        if (!vorhandenesProjekt) {

            const nummerAlsZahl =
                Number(nummer);


            if (!Number.isNaN(nummerAlsZahl)) {

                vorhandenesProjekt =
                    await projekteCollection.findOne({

                        projektnummer:
                            nummerAlsZahl

                    });
            }
        }


        if (vorhandenesProjekt) {

            console.log(
                "Projekt existiert bereits:",
                nummer
            );


            return res.status(409).json({

                error:
                    "Diese Projektnummer existiert bereits."

            });
        }


        // ---------------------------------------------
        // Neues Projekt
        // ---------------------------------------------

        const neuesProjekt = {

            projektnummer:
                nummer,

            titel:
                String(titel).trim(),

            beschreibung:
                beschreibung !== undefined &&
                beschreibung !== null
                    ? String(
                        beschreibung
                    ).trim()
                    : "",

            anmerkung:
                anmerkung !== undefined &&
                anmerkung !== null
                    ? String(
                        anmerkung
                    ).trim()
                    : "",

            datum:
                datum !== undefined &&
                datum !== null
                    ? String(
                        datum
                    )
                    : "",

            inArbeit:
                Boolean(inArbeit),

            fertig:
                Boolean(fertig),

            wartung:
                Boolean(wartung),

            erstelltAm:
                new Date(),

            geaendertAm:
                new Date()

        };


        // ---------------------------------------------
        // MongoDB speichern
        // ---------------------------------------------

        const result =
            await projekteCollection.insertOne(
                neuesProjekt
            );


        console.log(
            "Projekt erfolgreich gespeichert."
        );

        console.log(
            "Projektnummer:",
            nummer
        );

        console.log(
            "MongoDB ID:",
            result.insertedId
        );

        console.log(
            "---------------------------------"
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
            "FEHLER BEIM SPEICHERN DES PROJEKTS:"
        );

        console.error(error);


        res.status(500).json({

            error:
                "Projekt konnte nicht gespeichert werden.",

            details:
                error.message

        });
    }
});


// =====================================================
// PROJEKT BEARBEITEN
// =====================================================

app.put("/api/projekte/:nummer", async (req, res) => {

    try {

        const alteNummer =
            String(
                req.params.nummer
            ).trim();


        console.log(
            "---------------------------------"
        );

        console.log(
            "Projekt wird bearbeitet:"
        );

        console.log(
            "Alte Projektnummer:",
            alteNummer
        );


        const {
            projektnummer,
            titel,
            beschreibung,
            anmerkung,
            datum,
            inArbeit,
            fertig,
            wartung
        } = req.body;


        // ---------------------------------------------
        // Titel prüfen
        // ---------------------------------------------

        if (
            titel === undefined ||
            titel === null ||
            String(titel).trim() === ""
        ) {

            return res.status(400).json({

                error:
                    "Projekttitel fehlt."

            });
        }


        // ---------------------------------------------
        // Neue Nummer
        // ---------------------------------------------

        const neueNummer =
            projektnummer !== undefined &&
            projektnummer !== null &&
            String(projektnummer).trim() !== ""
                ? String(
                    projektnummer
                ).trim()
                : alteNummer;


        // ---------------------------------------------
        // Projekt suchen
        // ---------------------------------------------

        let vorhandenesProjekt =
            await projekteCollection.findOne({

                projektnummer:
                    alteNummer

            });


        // Alte Zahl berücksichtigen
        if (!vorhandenesProjekt) {

            const alteNummerAlsZahl =
                Number(alteNummer);


            if (
                !Number.isNaN(
                    alteNummerAlsZahl
                )
            ) {

                vorhandenesProjekt =
                    await projekteCollection.findOne({

                        projektnummer:
                            alteNummerAlsZahl

                    });
            }
        }


        if (!vorhandenesProjekt) {

            return res.status(404).json({

                error:
                    "Projekt nicht gefunden."

            });
        }


        // ---------------------------------------------
        // Prüfen ob neue Nummer bereits vergeben ist
        // ---------------------------------------------

        if (
            neueNummer !== alteNummer
        ) {

            const nummerBereitsVorhanden =
                await projekteCollection.findOne({

                    projektnummer:
                        neueNummer

                });


            if (nummerBereitsVorhanden) {

                return res.status(409).json({

                    error:
                        "Die neue Projektnummer existiert bereits."

                });
            }
        }


        // ---------------------------------------------
        // Änderungen
        // ---------------------------------------------

        const aenderungen = {

            projektnummer:
                neueNummer,

            titel:
                String(
                    titel
                ).trim(),

            beschreibung:
                beschreibung !== undefined &&
                beschreibung !== null
                    ? String(
                        beschreibung
                    ).trim()
                    : "",

            anmerkung:
                anmerkung !== undefined &&
                anmerkung !== null
                    ? String(
                        anmerkung
                    ).trim()
                    : "",

            datum:
                datum !== undefined &&
                datum !== null
                    ? String(
                        datum
                    )
                    : "",

            inArbeit:
                Boolean(inArbeit),

            fertig:
                Boolean(fertig),

            wartung:
                Boolean(wartung),

            geaendertAm:
                new Date()

        };


        // ---------------------------------------------
        // MongoDB aktualisieren
        // ---------------------------------------------

        const filter =
            vorhandenesProjekt._id
                ? {
                    _id:
                        vorhandenesProjekt._id
                }
                : {
                    projektnummer:
                        alteNummer
                };


        const result =
            await projekteCollection.updateOne(

                filter,

                {
                    $set:
                        aenderungen
                }

            );


        if (
            result.matchedCount === 0
        ) {

            return res.status(404).json({

                error:
                    "Projekt nicht gefunden."

            });
        }


        // ---------------------------------------------
        // Aktualisiertes Projekt laden
        // ---------------------------------------------

        const projekt =
            await projekteCollection.findOne({

                _id:
                    vorhandenesProjekt._id

            });


        console.log(
            "Projekt erfolgreich geändert."
        );

        console.log(
            "Neue Projektnummer:",
            neueNummer
        );

        console.log(
            "---------------------------------"
        );


        res.json({

            message:
                "Projekt erfolgreich geändert.",

            projekt:
                projekt

        });

    }
    catch (error) {

        console.error(
            "FEHLER BEIM BEARBEITEN:"
        );

        console.error(error);


        res.status(500).json({

            error:
                "Projekt konnte nicht geändert werden.",

            details:
                error.message

        });
    }
});


// =====================================================
// PROJEKT LÖSCHEN
// =====================================================

app.delete("/api/projekte/:nummer", async (req, res) => {

    try {

        const nummer =
            String(
                req.params.nummer
            ).trim();


        console.log(
            "---------------------------------"
        );

        console.log(
            "Projekt wird gelöscht:"
        );

        console.log(
            "Projektnummer:",
            nummer
        );


        // ---------------------------------------------
        // Erst als String suchen
        // ---------------------------------------------

        let projekt =
            await projekteCollection.findOne({

                projektnummer:
                    nummer

            });


        // ---------------------------------------------
        // Alte Zahlen berücksichtigen
        // ---------------------------------------------

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


        if (!projekt) {

            return res.status(404).json({

                error:
                    "Projekt nicht gefunden."

            });
        }


        // ---------------------------------------------
        // Löschen
        // ---------------------------------------------

        const result =
            await projekteCollection.deleteOne({

                _id:
                    projekt._id

            });


        if (
            result.deletedCount === 0
        ) {

            return res.status(404).json({

                error:
                    "Projekt konnte nicht gelöscht werden."

            });
        }


        console.log(
            "Projekt erfolgreich gelöscht."
        );

        console.log(
            "---------------------------------"
        );


        res.json({

            message:
                "Projekt erfolgreich gelöscht."

        });

    }
    catch (error) {

        console.error(
            "FEHLER BEIM LÖSCHEN:"
        );

        console.error(error);


        res.status(500).json({

            error:
                "Projekt konnte nicht gelöscht werden.",

            details:
                error.message

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
                    "Büro-Server läuft."
                );

                console.log(
                    "Port:",
                    PORT
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
