const mysql = require("mysql");
const {production} = require('./config.js');

const portNumber = production ? 3004 : 3003;
const dbname = production ? "omekas_production_db" : "omekas_db";

const cron = require('node-cron');

// Configura il cron job per eseguire createOrUpdate ogni notte alle 02:00 ora del server
cron.schedule('0 2 * * *', dropOldTablesAndUpdateData);

console.log('Scheduler avviato. Il metodo createOrUpdate verrà eseguito ogni notte alle 02:00 (ora del server).');

var updatingRelationships = false;
let locusRelationshipsDictionary = {};
let locusOverTimeRelationshipsDictionary = {};

console.log("chiamo test");
//dropOldTablesAndUpdateData();

function dropOldTablesAndUpdateData() {
    console.log("chiedo le tabelle");
    const con = mysql.createConnection({
        user: 'root', host: 'localhost', database: dbname, password: 'omekas_prin_2022', port: 3306, // Porta di default di PostgreSQL
    });

    // Connessione al database
    con.connect((err) => {
        console.log("error");
        console.log(err);
        if (err) {
            throw err;
        }
        console.log('Connesso al database MySQL!');

        // Esegui una query per ottenere tutti i nomi delle tabelle del database
        con.query('SHOW TABLES', (err, tables) => {
            console.log("SONO QUA");
            console.log(err);
            if (err) {
                throw err;
            }


            // Definisci una funzione per l'iterazione sequenziale attraverso le tabelle
            const dropNextTable = (index) => {
                if (index >= tables.length) {
                    // Se abbiamo iterato su tutte le tabelle, chiudi la connessione
                    console.log("chiudo la connessione e chiamo updateData()");
                    con.end();
                    updateData();
                    return;
                }

                const tableName = tables[index][`Tables_in_${con.config.database}`];

                console.log(tableName);

                if (tableName.includes("_DATEINFO_")) {
                    console.log("devo controllare questa tabella!");
                    var stringaDate = tableName.split("_DATEINFO_")[1];
                    var partiData = stringaDate.split('_');
                    var data = new Date(partiData[2], partiData[1] - 1, partiData[0]);
                    console.log(data);

                    var dataCorrente = new Date();
                    dataCorrente.setHours(0, 0, 0, 0); // Imposta ore, minuti, secondi e millisecondi a zero
                    console.log(dataCorrente);

                    // Calcola la differenza in millisecondi tra le due date
                    var differenzaInMillisecondi = Math.abs(dataCorrente - data);

                    // Calcola il numero di millisecondi in 3 giorni
                    var treGiorniInMillisecondi = 3 * 24 * 60 * 60 * 1000;

                    console.log(differenzaInMillisecondi);
                    // Verifica se la differenza è inferiore a tre giorni
                    if (differenzaInMillisecondi <= treGiorniInMillisecondi) {
                        console.log("Le date distano meno o esattamente di 3 giorni.");
                        // Passa alla tabella successiva
                        dropNextTable(index + 1);
                    } else {
                        console.log("Le date distano più di 3 giorni.");
                        // Esegui l'operazione di droppaggio della tabella
                        con.query(`DROP TABLE ${tableName}`, (err, result) => {
                            if (err) {
                                console.error(`Errore durante il drop della tabella ${tableName}:`, err);
                            } else {
                                console.log(`Tabella ${tableName} droppata con successo.`);
                            }

                            // Passa alla tabella successiva
                            dropNextTable(index + 1);
                        });
                    }
                } else {
                    dropNextTable(index + 1);
                }

            };

            // Inizia l'iterazione sequenziale con la prima tabella
            dropNextTable(0);
        });
    });
}

// Funzione per aggiornare le strutture dati
function updateData() {
    console.log("Aggiorno le strutture dati");

    // Configurazione del tuo database
    const con = mysql.createConnection({
        user: 'root', host: 'localhost', database: dbname, password: 'omekas_prin_2022', port: 3306, // Porta di default di PostgreSQL
    });

    updatingRelationships = true;

    Promise.all([getLocusRelationships(con), getLocusOverTimeRelationships(con)])
        .then(([updatedLocusRelationships, updatedLocuOverTimesRelationships]) => {
            locusRelationshipsDictionary = updatedLocusRelationships;
            locusOverTimeRelationshipsDictionary = updatedLocuOverTimesRelationships;
            //console.log('Strutture dati aggiornate:', updatedLocusRelationships, updatedLocuOverTimesRelationships);
            var prom = createOrUpdateRelationhipsTables(locusRelationshipsDictionary, locusOverTimeRelationshipsDictionary, con);

            prom.then(() => {
                console.log('Promise risolta con successo senza parametri.');

                //Resetto i dizionari
                locusRelationshipsDictionary = null;
                locusOverTimeRelationshipsDictionary = null;

                console.log("Strutture dati aggionate e dizionari impostati a null");

                updatingRelationships = false;

                console.log("Chiudo la connessione dopo updateData");
                con.end();

            }).catch((errore) => {
                console.error('Si è verificato un errore:', errore);
                console.log("Chiudo la connessione dopo un errore in updateData");
                con.end();
            });

        })
        .catch((err) => {
            console.error('Errore durante l\'aggiornamento delle strutture dati:', err);
        });
}

// Funzione per ottenere la mappa dei luoghi ricorsivamente
function getLocusRelationships(connection) {
    return new Promise((resolve, reject) => {
        const queries = [`START TRANSACTION`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
            SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
            FROM value v
             JOIN property p ON v.property_id = p.id;`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS locus AS
            SELECT r.id as object_id, rc.id as class_id, rc.local_name as class_name, rc.label FROM resource r join resource_class rc on r.resource_class_id=rc.id WHERE rc.local_name="LocusCatalogueRecord";
            `,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_grande_join_locus_relationships AS (
                SELECT t1.resource_id,
                       t1.property_id,
                       t1.local_name,
                       t1.value_resource_id,
                       t1.value,
                       t2.resource_id                           AS t2_resource_id,
                       t2.property_id                           AS t2_property_id,
                       t2.local_name                            AS t2_local_name,
                       t2.value_resource_id                     AS t2_value_resource_id,
                       t2.value                                 AS t2_value
                FROM tabella_unica t1
                         JOIN tabella_unica t2 ON t2.resource_id = t1.value_resource_id
                  WHERE t1.local_name = "hasRelationshipsWithLociData"
                  and t2.local_name IN ('locusLocatedIn', 'locusIsPartOf')
            );
            `,

            `CREATE TEMPORARY TABLE IF NOT EXISTS locus_relationships_free_type AS
                WITH RECURSIVE RelationsCTE AS (SELECT *
                                                FROM tabella_grande_join_locus_relationships tgj
                                                  WHERE t2_value_resource_id IN (SELECT object_id FROM locus)
                
                                                UNION ALL
                
                                                SELECT tgj.*
                                                FROM tabella_grande_join_locus_relationships tgj
                                                         JOIN RelationsCTE r ON r.resource_id = tgj.value_resource_id
                                                )
                SELECT *
                FROM RelationsCTE;
            `,

            //Questa query fa si che vengano recuperati anche i locus che non hanno nessun a relazione con altri locus, oppure che ce l'hanno, ma con un locus nel tempo e quindi che vengono scartati nella prima riga
            `SELECT resource_id, t2_value_resource_id FROM locus_relationships_free_type WHERE resource_id IN (SELECT object_id FROM locus) AND t2_value_resource_id IN (SELECT object_id FROM locus)
            UNION ALL
            SELECT object_id AS resource_id, NULL AS t2_value_resource_id
            FROM locus
            WHERE
                object_id NOT IN (SELECT resource_id FROM locus_relationships_free_type WHERE resource_id IN (SELECT object_id FROM locus) AND t2_value_resource_id IN (SELECT object_id FROM locus))
              AND
                object_id NOT IN (SELECT t2_value_resource_id FROM locus_relationships_free_type WHERE resource_id IN (SELECT object_id FROM locus) AND t2_value_resource_id IN (SELECT object_id FROM locus));`,

            `COMMIT;`, // Aggiungi altre query qui
        ];

        var results = []; // Array per salvare i risultati della terza query

        function executeBatchQueries(queries, index) {
            if (index < queries.length) {
                const query = queries[index];
                connection.query(query, (error, queryResults) => {
                    if (error) {
                        connection.rollback(() => {
                            console.error('getLocusRelationships - Errore nell\'esecuzione della query:', error);
                            //connection.end();
                        });
                    } else {
                        console.log("getLocusRelationships - Eseguo la query " + index);
                        if (index === 5) { // Verifica se questa è la terza query (l'indice 5)
                            let mappedArray = queryResults.map(item => [item.resource_id, item.t2_value_resource_id]);
                            var dictionary = getDictionary(mappedArray, "getLocusRelationships");
                            results = dictionary;
                        }
                    }
                    executeBatchQueries(queries, index + 1);
                });
            } else {
                resolve(results);
            }
        }

        executeBatchQueries(queries, 0);

    });
}


// Funzione per ottenere la mappa dei luoghi ricorsivamente
function getLocusOverTimeRelationships(connection) {
    return new Promise((resolve, reject) => {


        const queries = [`START TRANSACTION`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
            SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
            FROM value v
             JOIN property p ON v.property_id = p.id;`,

            `CREATE TEMPORARY TABLE IF NOT EXISTS locus AS
            SELECT r.id as object_id, rc.id as class_id, rc.local_name as class_name, rc.label FROM resource r join resource_class rc on r.resource_class_id=rc.id WHERE rc.local_name="LocusCatalogueRecord";
            `,

            `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_grande_join_locus_over_time AS (
                SELECT t1.resource_id, t1.property_id, t1.local_name, t1.value_resource_id, t1.value,
                       t2.resource_id AS t2_resource_id, t2.property_id AS t2_property_id,
                       t2.local_name AS t2_local_name, t2.value_resource_id AS t2_value_resource_id, t2.value AS t2_value,
                       t3.resource_id AS t3_resource_id, t3.property_id AS t3_property_id,
                       t3.local_name AS t3_local_name, t3.value_resource_id AS t3_value_resource_id, t3.value AS t3_value,
                       tipi.resource_id AS tipi_resource_id, tipi.property_id AS tipi_property_id,
                       tipi.local_name AS tipi_local_name, tipi.value_resource_id AS tipi_value_resource_id, tipi.value AS tipi_value,
                       tipolibero.resource_id AS tipolibero_resource_id, tipolibero.property_id AS tipolibero_property_id,
                       tipolibero.local_name AS tipolibero_local_name, tipolibero.value_resource_id AS tipolibero_value_resource_id, tipolibero.value AS tipolibero_value
                FROM tabella_unica t1
                         JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
                         JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                         JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
                         JOIN tabella_unica tipolibero ON tipi.value_resource_id = tipolibero.resource_id
                WHERE t1.local_name = 'hasLocusOverTimeData'
                  AND t2.local_name = 'hasRelationshipsWithLociData'
                  AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf')
            );
            `,

            `CREATE TEMPORARY TABLE IF NOT EXISTS locus_over_time_free_type AS
                WITH RECURSIVE RelationsCTE AS (
                    SELECT *
                    FROM tabella_grande_join_locus_over_time tgj
                    -- Aggiunta della condizione per la ricorsione
                    WHERE t3_value_resource_id IN (SELECT object_id FROM locus)
                
                    UNION ALL
                
                    SELECT tgj.*
                    FROM tabella_grande_join_locus_over_time tgj
                             JOIN RelationsCTE r ON tgj.t3_value_resource_id = r.resource_id
                )
                SELECT *
                FROM RelationsCTE;
            `,

            `SELECT distinct resource_id, t3_value_resource_id FROM locus_over_time_free_type;`,

            `COMMIT;`, // Aggiungi altre query qui
        ];

        var results = []; // Array per salvare i risultati della terza query

        function executeBatchQueries(queries, index) {
            if (index < queries.length) {
                const query = queries[index];
                connection.query(query, (error, queryResults) => {
                    if (error) {
                        connection.rollback(() => {
                            console.error('getLocusOverTimeRelationships - Errore nell\'esecuzione della query:', error);
                        });
                    } else {
                        console.log("getLocusOverTimeRelationships - Eseguo la query " + index);

                        if (index === 5) { // Verifica se questa è la terza query (l'indice 5)
                            let mappedArray = queryResults.map(item => [item.resource_id, item.t3_value_resource_id]);
                            var dictionary = getDictionary(mappedArray, "getLocusOverTimeRelationships");
                            results = dictionary;
                        }
                    }
                    executeBatchQueries(queries, index + 1);
                });
            } else {
                resolve(results);
            }
        }

        executeBatchQueries(queries, 0);
    });
}

function createOrUpdateRelationhipsTables(locusRelationshipsDictionary, locusOverTimeRelationshipsDictionary, connection) {
    //TODO: scrivere commento per ogni query nell'array!
    const queries = [`START TRANSACTION;`,

        `DROP TEMPORARY TABLE IF EXISTS tabella_unica;`,

        `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
        SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value, rc.local_name AS resource_class
        FROM value v
                 JOIN property p ON v.property_id = p.id JOIN resource r ON v.resource_id = r.id JOIN resource_class rc ON r.resource_class_id = rc.id;
        ;`,

        `CREATE TABLE IF NOT EXISTS LocusRelationships_new (
                                    ID INT PRIMARY KEY,
                                    Lista_id_connessi TEXT
            );`,

        `CREATE TABLE IF NOT EXISTS LocusRelationshipsNew_new (
                                    ID_PARENT INT,
                                    ID_CHILD INT,
                                    PRIMARY KEY (ID_PARENT, ID_CHILD)
            );`,

        `CREATE TABLE IF NOT EXISTS LocusOverTimeRelationships_new (
                                    ID INT PRIMARY KEY,
                                    Lista_id_connessi TEXT
            );`,

        `CREATE TABLE IF NOT EXISTS LocusOverTimeRelationshipsNew_new (
                                    ID_PARENT INT,
                                    ID_CHILD INT,
                                    PRIMARY KEY (ID_PARENT, ID_CHILD)
                                   
            );`,

        `CREATE TABLE FilmInLocus_new (
                                       id_luogo INT,
                                       id_film INT,
                                       PRIMARY KEY (id_luogo, id_film)
        );`,

        `CREATE TABLE IF NOT EXISTS table_join_free_type_new AS
        SELECT t1.resource_id, tipi.value as tipolibero_value
        FROM tabella_unica t1
                 LEFT JOIN tabella_unica caratterizzazione_base ON t1.value_resource_id = caratterizzazione_base.resource_id
                 LEFT JOIN tabella_unica tipi ON caratterizzazione_base.value_resource_id = tipi.resource_id
        WHERE t1.resource_class = "LocusCatalogueRecord" and t1.local_name = "hasBasicCharacterizationData"
          and caratterizzazione_base.local_name = "hasTypeData" and tipi.local_name = "type";`,

        `CREATE TABLE IF NOT EXISTS table_join_type_name_new AS
        SELECT t1.resource_id, tipoiri.value as nometipo_value
        FROM tabella_unica t1
                 LEFT JOIN tabella_unica caratterizzazione_base ON t1.value_resource_id = caratterizzazione_base.resource_id
                 LEFT JOIN tabella_unica tipi ON caratterizzazione_base.value_resource_id = tipi.resource_id
                 LEFT JOIN tabella_unica tipoiri ON tipi.value_resource_id = tipoiri.resource_id
        WHERE t1.resource_class = "LocusCatalogueRecord" and t1.local_name = "hasBasicCharacterizationData"
          and caratterizzazione_base.local_name = "hasTypeData"  and tipi.local_name = "hasIRITypeData" and tipoiri.local_name = "typeName";`,

        `CREATE TABLE IF NOT EXISTS table_join_locus_over_time_free_type_new AS
        SELECT t1.resource_id AS t1_resource_id, t1.local_name AS t1_local_name, t1.value_resource_id AS t1_value_resource_id, t1.value AS t1_value, t1.resource_class AS t1_resource_class,
        t2.resource_id AS t2_resource_id, t2.local_name AS t2_local_name, t2.value_resource_id AS t2_value_resource_id, t2.value AS t2_value, t2.resource_class AS t2_resource_class,
        t3.resource_id AS t3_resource_id, t3.local_name AS t3_local_name, t3.value_resource_id AS t3_value_resource_id, t3.value AS t3_value, t3.resource_class AS t3_resource_class,
        tipi.resource_id AS tipi_resource_id, tipi.local_name AS tipi_local_name, tipi.value_resource_id AS tipi_value_resource_id, tipi.value AS tipi_value, tipi.resource_class AS tipi_resource_class,
        tipolibero.resource_id AS tipolibero_resource_id, tipolibero.local_name AS tipolibero_local_name, tipolibero.value_resource_id AS tipolibero_value_resource_id , tipolibero.value AS tipolibero_value, tipolibero.resource_class AS tipolibero_resource_class
        FROM tabella_unica t1
        JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
        JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
        JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
        JOIN tabella_unica tipolibero ON tipi.value_resource_id = tipolibero.resource_id
        WHERE t1.resource_class = "LocusCatalogueRecord" AND t1.local_name = 'hasLocusOverTimeData'
        AND t2.local_name = 'hasRelationshipsWithLociData'
        AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf')`,

        `CREATE TABLE IF NOT EXISTS table_join_locus_over_time_type_name_new AS
        SELECT t1.resource_id AS t1_resource_id, t1.local_name AS t1_local_name, t1.value_resource_id AS t1_value_resource_id, t1.value AS t1_value, t1.resource_class AS t1_resource_class,
        t2.resource_id AS t2_resource_id, t2.local_name AS t2_local_name, t2.value_resource_id AS t2_value_resource_id, t2.value AS t2_value, t2.resource_class AS t2_resource_class,
        t3.resource_id AS t3_resource_id, t3.local_name AS t3_local_name, t3.value_resource_id AS t3_value_resource_id, t3.value AS t3_value, t3.resource_class AS t3_resource_class,
        tipi.resource_id AS tipi_resource_id, tipi.local_name AS tipi_local_name, tipi.value_resource_id AS tipi_value_resource_id, tipi.value AS tipi_value, tipi.resource_class AS tipi_resource_class,
        tipoiri.resource_id AS tipoiri_resource_id, tipoiri.local_name AS tipoiri_local_name, tipoiri.value_resource_id AS tipoiri_value_resource_id, tipoiri.value AS tipoiri_value, tipoiri.resource_class AS tipoiri_resource_class,
        nometipo.resource_id AS nometipo_resource_id, nometipo.local_name AS nometipo_local_name, nometipo.value_resource_id AS nometipo_value_resource_id, nometipo.value AS nometipo_value, nometipo.resource_class AS nometipo_resource_class
        FROM tabella_unica t1
        JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
        JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
        JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
        JOIN tabella_unica tipoiri ON tipi.value_resource_id = tipoiri.resource_id
        JOIN tabella_unica nometipo ON tipoiri.value_resource_id = nometipo.resource_id
        WHERE t1.resource_class = "LocusCatalogueRecord" AND t1.local_name = 'hasLocusOverTimeData'
        AND t2.local_name = 'hasRelationshipsWithLociData'
        AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf');`,
    ];

    //Creo la query per locusRelationshipsDictionary
    var queryLocusRelationshipsDictionary = `INSERT INTO LocusRelationships_new (ID, Lista_id_connessi) VALUES `;

    // Rimuovo la chiave null
    delete locusRelationshipsDictionary["null"];

    let chiavi = Object.keys(locusRelationshipsDictionary);
    console.log("locusRelationshipsDictionary - ECCO QUA");
    console.log(JSON.stringify(locusRelationshipsDictionary));

    console.log("locusOverTimeRelationshipsDictionary - chiavi");
    console.log(JSON.stringify(chiavi));

    chiavi.forEach((chiave, indice) => {

        let valore = [...locusRelationshipsDictionary[chiave]];
        valore.unshift(chiave);

        queryLocusRelationshipsDictionary += `(${chiave}, '${valore}')`;

        if (indice < chiavi.length - 1) {
            queryLocusRelationshipsDictionary += ', ';
        } else {
            queryLocusRelationshipsDictionary += ';';
        }

    });


    //LocusRelationshipsNew

    //Creo la query per locusRelationshipsDictionary
    var queryLocusRelationshipsDictionaryNew = `INSERT INTO LocusRelationshipsNew_new (ID_PARENT, ID_CHILD) VALUES `;

    chiavi.forEach((chiave, indice) => {

        let valore = locusRelationshipsDictionary[chiave];
        console.log("CHIAVE");
        console.log(chiave);
        console.log("VALORE");
        console.log(valore);

        queryLocusRelationshipsDictionaryNew += `(${chiave}, ${chiave})`;

        var CommaAlreadyAdded = false;
        if (valore.length === 0 && indice < chiavi.length - 1) {
            queryLocusRelationshipsDictionaryNew += ', ';
            CommaAlreadyAdded = true;
        } else {
            if (indice < chiavi.length - 1) {
                queryLocusRelationshipsDictionaryNew += ', ';
            } else {
                queryLocusRelationshipsDictionaryNew += ';';
            }
        }

        if (valore.length > 0) {
            valore.forEach((val, index) => {
                queryLocusRelationshipsDictionaryNew += `(${chiave}, ${val})`;

                if (index < valore.length - 1) {
                    queryLocusRelationshipsDictionaryNew += ', ';
                }
            })
        }

        if (!CommaAlreadyAdded && indice < chiavi.length - 1) {
            queryLocusRelationshipsDictionaryNew += ', ';
        }
        /*if(valore.length === 0 && indice < chiavi.length - 1){
            queryLocusRelationshipsDictionaryNew += ', ';
        } else {
            if (indice < chiavi.length - 1) {
                queryLocusRelationshipsDictionaryNew += ', ';
            } else {
                queryLocusRelationshipsDictionaryNew += ';';
            }
        }*/
        /*
        queryLocusRelationshipsDictionaryNew += `(${chiave}, '${valore}')`;

        if (indice < chiavi.length - 1) {
            queryLocusRelationshipsDictionaryNew += ', ';
        } else {
            queryLocusRelationshipsDictionaryNew += ';';
        }
*/
    });

    console.log("queryLocusRelationshipsDictionaryNew");
    console.log(queryLocusRelationshipsDictionaryNew);


    //Creo la query per locusOverTimeRelationshipsDictionary
    var queryLocusOverTimeRelationshipsDictionary = `INSERT INTO LocusOverTimeRelationships_new (ID, Lista_id_connessi) VALUES `;

    // Rimuovo la chiave null
    delete locusOverTimeRelationshipsDictionary["null"];

    console.log("locusOverTimeRelationshipsDictionary");
    console.log(JSON.stringify(locusOverTimeRelationshipsDictionary));

    let chiaviOverTime = Object.keys(locusOverTimeRelationshipsDictionary);

    console.log("locusOverTimeRelationshipsDictionary - chiaviOverTime");
    console.log(JSON.stringify(chiaviOverTime));

    chiaviOverTime.forEach((chiave, indice) => {
        let valore = locusOverTimeRelationshipsDictionary[chiave];
        queryLocusOverTimeRelationshipsDictionary += `(${chiave}, '${valore}')`;

        if (indice < chiaviOverTime.length - 1) {
            queryLocusOverTimeRelationshipsDictionary += ', ';
        } else {
            queryLocusOverTimeRelationshipsDictionary += ';';
        }
    });

    if (chiavi.length > 0) {
        queries.push(queryLocusRelationshipsDictionary);
        queries.push(queryLocusRelationshipsDictionaryNew);
    }


    if (chiaviOverTime.length > 0) {
        queries.push(queryLocusOverTimeRelationshipsDictionary);
    }

    queries.push(`CREATE TEMPORARY TABLE IF NOT EXISTS tabella_utility_film_in_locus AS
        SELECT t1.resource_id as t1_resource_id, t1.property_id as t1_property_id, t1.local_name as t1_local_name, t1.value_resource_id as t1_value_resource_id, t2.resource_id as t2_resource_id, t2.property_id as t2_property_id, t2.local_name as t2_local_name, t2.value_resource_id as t2_value_resource_id,
               t3.resource_id as t3_resource_id, t3.property_id as t3_property_id, t3.local_name as t3_local_name, t3.value_resource_id as t3_value_resource_id
        FROM tabella_unica t1
                 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
                 JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id;`);

    queries.push(`INSERT INTO FilmInLocus_new (ID_LUOGO, ID_FILM)
        SELECT distinct L.ID_PARENT, av.value_resource_id as film_resource_id
        FROM tabella_unica rl1
                 JOIN tabella_unica uc ON rl1.value_resource_id = uc.resource_id
                 JOIN tabella_unica av ON uc.value_resource_id = av.resource_id
        CROSS JOIN (
            SELECT distinct ID_PARENT
            FROM LocusRelationshipsNew
        ) L
             WHERE rl1.local_name = 'hasLinkedFilmUnitCatalogueRecord'
          AND uc.local_name = 'hasLinkedFilmCopyCatalogueRecord'
          AND av.local_name = 'hasLinkedFilmCatalogueRecord'
          AND rl1.resource_id IN (
            SELECT t1_resource_id
            FROM tabella_utility_film_in_locus
            WHERE (t3_value_resource_id IN (SELECT ID_CHILD FROM LocusRelationshipsNew WHERE ID_PARENT = L.ID_PARENT) AND t2_local_name = 'hasSinglePlaceRepresentationData'
                AND t3_local_name IN ('placeRepresentationHasDisplayedObject', 'placeRepresentationHasRepresentedNarrativePlace'))
               OR (t2_value_resource_id IN (SELECT ID_CHILD FROM LocusRelationshipsNew WHERE ID_PARENT = L.ID_PARENT) AND t2_local_name = 'placeRepresentationHasCameraPlacement')
               OR (t2_value_resource_id IN (SELECT ID_CHILD FROM LocusRelationshipsNew WHERE ID_PARENT = L.ID_PARENT) AND t2_local_name = 'placeRepresentationHasContextualNarrativePlace')
        );`);

    // Ottieni la data di oggi nel formato gg_mm_aa
    const today = new Date();
    const formattedDate = `${today.getDate()}_${today.getMonth() + 1}_${today.getFullYear()}`;

    //RENAME TABLE nome_tabella_originale TO nuovo_nome_tabella;
    queries.push(`RENAME TABLE table_join_free_type TO table_join_free_type_DATEINFO_${formattedDate};`);
    queries.push(`RENAME TABLE table_join_type_name TO table_join_type_name_DATEINFO_${formattedDate};`);
    queries.push(`RENAME TABLE table_join_locus_over_time_free_type TO table_join_locus_over_time_free_type_DATEINFO_${formattedDate};`);
    queries.push(`RENAME TABLE table_join_locus_over_time_type_name TO table_join_locus_over_time_type_name_DATEINFO_${formattedDate};`);
    queries.push(`RENAME TABLE LocusRelationshipsNew TO LocusRelationshipsNew_DATEINFO_${formattedDate};`);
    queries.push(`RENAME TABLE LocusRelationships TO LocusRelationships_DATEINFO_${formattedDate};`);
    queries.push(`RENAME TABLE LocusOverTimeRelationships TO LocusOverTimeRelationships_DATEINFO_${formattedDate};`);
    queries.push(`RENAME TABLE LocusOverTimeRelationshipsNew TO LocusOverTimeRelationshipsNew_DATEINFO_${formattedDate};`);
    queries.push(`DROP TEMPORARY TABLE IF EXISTS tabella_unica;`);
    queries.push(`RENAME TABLE FilmInLocus TO FilmInLocus_DATEINFO_${formattedDate};`);


    queries.push(`RENAME TABLE table_join_free_type_new TO table_join_free_type;`);
    queries.push(`RENAME TABLE table_join_type_name_new TO table_join_type_name;`);
    queries.push(`RENAME TABLE table_join_locus_over_time_free_type_new TO table_join_locus_over_time_free_type;`);
    queries.push(`RENAME TABLE table_join_locus_over_time_type_name_new TO table_join_locus_over_time_type_name;`);
    queries.push(`RENAME TABLE LocusRelationshipsNew_new TO LocusRelationshipsNew;`);
    queries.push(`RENAME TABLE LocusRelationships_new TO LocusRelationships;`);
    queries.push(`RENAME TABLE LocusOverTimeRelationships_new TO LocusOverTimeRelationships;`);
    queries.push(`RENAME TABLE LocusOverTimeRelationshipsNew_new TO LocusOverTimeRelationshipsNew;`);
    queries.push(`DROP TEMPORARY TABLE IF EXISTS tabella_unica;`);
    queries.push(`RENAME TABLE FilmInLocus_new TO FilmInLocus;`);

    queries.push("COMMIT;");

    console.log(queries);


    return new Promise((resolve, reject) => {

        function executeBatchQueries(queries, index) {
            console.log("queries.length: ", queries.length);
            console.log("INDEX: ", index);
            if (index < queries.length) {
                const query = queries[index];
                connection.query(query, (error, queryResults) => {
                    if (error) {
                        console.log("SONO IN ERRORE");
                        connection.rollback(() => {
                            console.error('getLocusRelationships - Errore nell\'esecuzione della query:', error);
                            //connection.end();
                        });
                    } else {
                        //Tutto ok

                        console.log("\n\n\nQuery eseguita con successo");
                        console.log(query);
                    }
                    executeBatchQueries(queries, index + 1);
                });
            } else {
                resolve();
            }
        }

        executeBatchQueries(queries, 0);

    });
}

function getRelatedPlaces(result, place, visited = new Set()) {
    let related = result[place] || [];
    visited.add(place);  // Aggiungi il luogo corrente all'insieme di luoghi visitati

    related.forEach(p => {
        if (!visited.has(p)) {  // Verifica se il luogo non è stato visitato per evitare la ricorsione infinita
            related = [...new Set([...related, ...getRelatedPlaces(result, p, visited)])];
        }
    });

    return related;
}


function getDictionary(data, caller) {
    console.log("\n\n\n\nDATA QUA -" + caller);
    console.log(data);
    console.log(JSON.stringify(data));

    let result = {};

    // Costruzione del dizionario
    data.forEach(([place, part_of]) => {
        if (!result[part_of]) {
            result[part_of] = [];
        }
        if (!result[place]) {
            result[place] = [];
        }

        result[part_of].push(place);
    });

    // Aggiunta degli elementi correlati
    Object.keys(result).forEach(place => {
        result[place] = [...new Set(getRelatedPlaces(result, place).filter(p => p !== parseInt(place)))];
    });

    // Aggiunta delle chiavi mancanti con liste vuote
    const allKeys = Array.from(new Set(data.reduce((acc, [a, b]) => acc.concat(a, b), [])));
    allKeys.forEach(key => {
        if (!result[key]) {
            result[key] = [];
        }
    });

    return result;
}
