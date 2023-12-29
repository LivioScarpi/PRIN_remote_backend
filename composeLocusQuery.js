function composeLocusQuery(objectFilters) {
    console.log("COMPOSE FILM TITLE!!");

    var query = "CREATE TEMPORARY TABLE rappr_luogo AS(";
    /*
    var query = `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
                SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
                FROM value v
                         JOIN property p ON v.property_id = p.id;
                `;*/

    var query_parts = [false, false, false, false];

    if (objectFilters.ucCastMemberName !== '' && objectFilters.ucCastMemberName !== null) {


        //            --Seleziona le Rappresentazioni luogo che hanno una certa persona presente (si guarda sia il campo interprete sia il campo personaggio)
        const titleTextFilmTitle = `
            SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id WHERE t1.local_name = "hasPresentPersonData" and t2.local_name IN ("presentPersonCastMemberName", "presentPersonCharacterName") and t2.value LIKE "%${objectFilters.ucCastMemberName}%"
            \n`;

        query += titleTextFilmTitle;
        query_parts[0] = true;
    }

    //Altre entità mostrate
    if (objectFilters.otherEntitiesType !== '' && objectFilters.otherEntitiesType !== null) {

        if (query_parts[0]) {
            query += '\n INTERSECT \n'
        }

        //                --Seleziona le Rappresentazioni luogo che hanno il nome tipo selezionato

        //                --Seleziona le Rappresentazioni luogo che hanno il tipo libero selezionato
        const otherEntities = `
                SELECT * FROM (SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id JOIN tabella_unica t4 ON t3.value_resource_id = t4.resource_id  WHERE t1.local_name = "hasOtherShownEntitiesData" and t2.local_name = "hasTypeData" and t3.local_name = "hasIRITypeData" and t4.local_name = "typeName" and t4.value = "${objectFilters.otherEntitiesType}"
                UNION
                SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id WHERE t1.local_name = "hasOtherShownEntitiesData" and t2.local_name = "hasTypeData" and t3.local_name = "type" and t3.value = "${objectFilters.otherEntitiesType}"
                ) as otherEntitiesType\n`;

        query += otherEntities;
        query_parts[1] = true;
    }


    if (objectFilters.cameraPlacementLocusInRegionIDs.length > 0) {

        if (query_parts[0] || query_parts[1]) {
            query += '\n INTERSECT \n'
        }

        const cameraPlacement = `SELECT *
                   FROM (
            SELECT * FROM (SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id WHERE t1.local_name = "hasPlacesData" and t2.local_name = "placeRepresentationHasCameraPlacement" and t2.value_resource_id IN (SELECT * FROM camera_locus_list_free_type)
            UNION
            SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id WHERE t1.local_name = "hasPlacesData" and t2.local_name = "hasSinglePlaceRepresentationData" and t3.local_name = "placeRepresentationHasDisplayedObject" and t3.value_resource_id IN (SELECT * FROM camera_locus_list_free_type)
            ) as p1
            
            UNION
            
            SELECT * FROM (SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id WHERE t1.local_name = "hasPlacesData" and t2.local_name = "placeRepresentationHasCameraPlacement" and t2.value_resource_id IN (SELECT * FROM camera_locus_list_type_name)
            UNION
            SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id WHERE t1.local_name = "hasPlacesData" and t2.local_name = "hasSinglePlaceRepresentationData" and t3.local_name = "placeRepresentationHasDisplayedObject" and t3.value_resource_id IN (SELECT * FROM camera_locus_list_type_name)
            ) AS p2
            
            UNION
            
            SELECT * FROM (SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id WHERE t1.local_name = "hasPlacesData" and t2.local_name = "placeRepresentationHasCameraPlacement" and t2.value_resource_id IN (SELECT * FROM camera_locus_over_time_list_free_type)
            UNION
            SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id WHERE t1.local_name = "hasPlacesData" and t2.local_name = "hasSinglePlaceRepresentationData" and t3.local_name = "placeRepresentationHasDisplayedObject" and t3.value_resource_id IN (SELECT * FROM camera_locus_over_time_list_free_type)
            ) AS p3
            
            UNION
            
            SELECT * FROM (SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id WHERE t1.local_name = "hasPlacesData" and t2.local_name = "placeRepresentationHasCameraPlacement" and t2.value_resource_id IN (SELECT * FROM camera_locus_over_time_list_type_name)
            UNION
            SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id WHERE t1.local_name = "hasPlacesData" and t2.local_name = "hasSinglePlaceRepresentationData" and t3.local_name = "placeRepresentationHasDisplayedObject" and t3.value_resource_id IN (SELECT * FROM camera_locus_over_time_list_type_name)
            ) as p4) AS test`;


        query += cameraPlacement;

        query_parts[2] = true;
    }

    if (objectFilters.narrativeLocusInRegionIDs.length > 0) {

        if (query_parts[0] || query_parts[1] || query_parts[2]) {
            query += '\n INTERSECT \n'
        }

        //    --Seleziono le Rappresentazioni luogo che hanno un certo contesto narrativo
        var narrativePlace = `
    SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id LEFT JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
    WHERE t1.local_name = "hasPlacesData" and t2.local_name = "hasSinglePlaceRepresentationData" and t3.value_resource_id IN (SELECT * FROM narrative_locus_list_free_type UNION SELECT * FROM narrative_locus_list_type_name UNION SELECT * FROM narrative_locus_over_time_list_free_type UNION SELECT * FROM narrative_locus_over_time_list_type_name)`;

        if ((objectFilters.narrativeSeason !== "" && objectFilters.narrativeSeason !== null && objectFilters.narrativeSeason !== undefined)
            || (objectFilters.narrativeWeather !== "" && objectFilters.narrativeWeather !== null && objectFilters.narrativeWeather !== undefined)
            || (objectFilters.narrativePartOfDay !== "" && objectFilters.narrativePartOfDay !== null && objectFilters.narrativePartOfDay !== undefined)) {

            var condition_parts = [false, false, false];

            var condition = `INTERSECT
    SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id WHERE t1.local_name = "hasPlacesData" and t2.local_name IN ("seasonInNarrative", "hasSinglePlaceRepresentationData", "partOfDayInNarrative", "weatherConditionsInNarrative")
    and (
    `;

            if (objectFilters.narrativeSeason !== "" && objectFilters.narrativeSeason !== null && objectFilters.narrativeSeason !== undefined) {
                condition += `(t2.local_name = "seasonInNarrative" and t2.value = "${objectFilters.narrativeSeason}")`;
                condition_parts[0] = true;
            }

            if (objectFilters.narrativePartOfDay !== "" && objectFilters.narrativePartOfDay !== null && objectFilters.narrativePartOfDay !== undefined) {

                if (condition_parts[0]) {
                    condition += " or "
                }

                condition += `(t2.local_name = "partOfDayInNarrative" and t2.value = "${objectFilters.narrativePartOfDay}")`;
                condition_parts[1] = true;
            }

            if (objectFilters.narrativeWeather !== "" && objectFilters.narrativeWeather !== null && objectFilters.narrativeWeather !== undefined) {

                if (condition_parts[0] || condition_parts[1]) {
                    condition += " or "
                }

                condition += `(t2.local_name = "weatherConditionsInNarrative" and t2.value = "${objectFilters.narrativeWeather}")`;
                condition_parts[1] = true;
            }

            condition += ")";

            narrativePlace += condition;
        }

        narrativePlace += ";"

        query += narrativePlace;

        query_parts[3] = true;
    }

    query += ");"

    return query;
}


function ottieniValoriConnessi(inputList, data) {
    const result = [...inputList]; // Copia della lista di input

    // Funzione ricorsiva per trovare i valori connessi
    function trovaValoriConnessi(numero) {
        if (data[numero]) {
            data[numero].forEach(valore => {
                if (!result.includes(valore)) {
                    result.push(valore);
                    trovaValoriConnessi(valore); // Richiama la funzione per esplorare ulteriori valori
                }
            });
        }
    }

    // Trova i valori connessi per ciascun numero nella lista di input
    inputList.forEach(numero => {
        trovaValoriConnessi(numero);
    });

    return result;
}

function composeLocusRelationships(queries, ids, type, filter, locusRelationshipsDictionary) {
    console.log("SONO IN composeLocusRelationshipsFreeType");

    //console.log(queries);
    //console.log(ids);
    //console.log(type);

    const string_ids = ids.join(', ');

    var list = ottieniValoriConnessi(ids, locusRelationshipsDictionary);
    console.log("LIST OTTIENI VALORI CONNESSI");

    console.log(list);
    const list_string_ids = list.join(', ');

    //Tipo libero
    /*
    queries.push(`CREATE TEMPORARY TABLE IF NOT EXISTS ${filter}_locus_relationships_free_type AS
                    WITH RECURSIVE RelationsCTE AS (SELECT t1.resource_id,
                                                           t1.property_id,
                                                           t1.local_name,
                                                           t1.value_resource_id,
                                                           t1.value,
                                                           t2.resource_id                           AS t2_resource_id,
                                                           t2.property_id                           AS t2_property_id,
                                                           t2.local_name                            AS t2_local_name,
                                                           t2.value_resource_id                     AS t2_value_resource_id,
                                                           t2.value                                 AS t2_value,
                                                           caratterizzazione_base.resource_id       AS caratterizzazione_base_resource_id,
                                                           caratterizzazione_base.property_id       AS caratterizzazione_base_property_id,
                                                           caratterizzazione_base.local_name        AS caratterizzazione_base_local_name,
                                                           caratterizzazione_base.value_resource_id AS caratterizzazione_base_value_resource_id,
                                                           caratterizzazione_base.value             AS caratterizzazione_base_value,
                                                           tipi.resource_id                         AS tipi_resource_id,
                                                           tipi.property_id                         AS tipi_property_id,
                                                           tipi.local_name                          AS tipi_local_name,
                                                           tipi.value_resource_id                   AS tipi_value_resource_id,
                                                           tipi.value                               AS tipi_value,
                                                           tipolibero.resource_id                      AS tipolibero_resource_id,
                                                           tipolibero.property_id                      AS tipolibero_property_id,
                                                           tipolibero.local_name                       AS tipolibero_local_name,
                                                           tipolibero.value_resource_id                AS tipolibero_value_resource_id,
                                                           tipolibero.value                            AS tipolibero_value
                                                    FROM tabella_unica t1
                                                             JOIN tabella_unica t2 ON t2.resource_id = t1.value_resource_id
                                                             JOIN tabella_unica caratterizzazione_base
                                                                  ON t1.resource_id = caratterizzazione_base.resource_id
                                                             JOIN tabella_unica tipi
                                                                  ON caratterizzazione_base.value_resource_id = tipi.resource_id
                                                             JOIN tabella_unica tipolibero ON tipi.value_resource_id = tipolibero.resource_id
                                                    WHERE t2.value_resource_id IN (${string_ids})
                                                      and t1.local_name = "hasRelationshipsWithLociData"
                                                      and t2.local_name IN ('locusLocatedIn', 'locusIsPartOf')
                    
                                                    UNION ALL
                    
                                                    SELECT t1.resource_id,
                                                           t1.property_id,
                                                           t1.local_name,
                                                           t1.value_resource_id,
                                                           t1.value,
                                                           t2.resource_id                           AS t2_resource_id,
                                                           t2.property_id                           AS t2_property_id,
                                                           t2.local_name                            AS t2_local_name,
                                                           t2.value_resource_id                     AS t2_value_resource_id,
                                                           t2.value                                 AS t2_value,
                                                           caratterizzazione_base.resource_id       AS caratterizzazione_base_resource_id,
                                                           caratterizzazione_base.property_id       AS caratterizzazione_base_property_id,
                                                           caratterizzazione_base.local_name        AS caratterizzazione_base_local_name,
                                                           caratterizzazione_base.value_resource_id AS caratterizzazione_base_value_resource_id,
                                                           caratterizzazione_base.value             AS caratterizzazione_base_value,
                                                           tipi.resource_id                         AS tipi_resource_id,
                                                           tipi.property_id                         AS tipi_property_id,
                                                           tipi.local_name                          AS tipi_local_name,
                                                           tipi.value_resource_id                   AS tipi_value_resource_id,
                                                           tipi.value                               AS tipi_value,
                                                           tipolibero.resource_id                      AS tipolibero_resource_id,
                                                           tipolibero.property_id                      AS tipolibero_property_id,
                                                           tipolibero.local_name                       AS tipolibero_local_name,
                                                           tipolibero.value_resource_id                AS tipolibero_value_resource_id,
                                                           tipolibero.value                            AS tipolibero_value
                                                    FROM tabella_unica t1
                                                             JOIN tabella_unica t2 ON t2.resource_id = t1.value_resource_id
                                                             JOIN RelationsCTE r ON r.resource_id = t2.value_resource_id
                                                             JOIN tabella_unica caratterizzazione_base
                                                                  ON t1.resource_id = caratterizzazione_base.resource_id
                                                             JOIN tabella_unica tipi
                                                                  ON caratterizzazione_base.value_resource_id = tipi.resource_id
                                                             JOIN tabella_unica tipolibero ON tipi.value_resource_id = tipolibero.resource_id
                                                    WHERE t1.local_name = "hasRelationshipsWithLociData"
                                                      and t2.local_name IN ('locusLocatedIn', 'locusIsPartOf'))
                    SELECT *
                    FROM RelationsCTE;
                    `);*/


    var q = `CREATE TEMPORARY TABLE IF NOT EXISTS ${filter}_locus_list_free_type AS (
            SELECT distinct resource_id
            FROM (
                  SELECT t1.resource_id
                  FROM tabella_unica t1
                           LEFT JOIN tabella_unica t2 ON t2.resource_id = t1.value_resource_id
                           LEFT JOIN tabella_unica caratterizzazione_base ON t1.resource_id = caratterizzazione_base.resource_id
                           LEFT JOIN tabella_unica tipi ON caratterizzazione_base.value_resource_id = tipi.resource_id
                           LEFT JOIN tabella_unica tipolibero ON tipi.value_resource_id = tipolibero.resource_id
                  WHERE FIND_IN_SET(t1.resource_id, (
                            SELECT GROUP_CONCAT(ID SEPARATOR ',') AS All_List
                            FROM (
                                     SELECT ID FROM LocusRelationships WHERE ID IN (${ids})
                                     UNION ALL
                                     SELECT DISTINCT Lista_id_connessi AS ID FROM LocusRelationships WHERE ID IN (${ids}) AND Lista_id_connessi <> ''
                                 ) AS CombinedResults
                        ))
                  `;

    if (type !== "" && type !== null && type !== undefined) {
        q += `and caratterizzazione_base.local_name = "hasBasicCharacterizationData"
                    and tipi.local_name = "hasTypeData"`
    }


    q += `) AS luoghi`;

    if (type !== "" && type !== null && type !== undefined) {
        q += ` WHERE tipolibero_value like "${type}"`
    }

    q += ');';

    queries.push(q);

    console.log("\n\n\nSTAMPO LA QUERY MODIFICATA QUAAAA");
    console.log(q);


    //Nome tipo
    /*
    queries.push(`CREATE TEMPORARY TABLE IF NOT EXISTS ${filter}_locus_relationships_type_name AS
                    WITH RECURSIVE RelationsCTE AS (SELECT t1.resource_id,
                                                           t1.property_id,
                                                           t1.local_name,
                                                           t1.value_resource_id,
                                                           t1.value,
                                                           t2.resource_id                           AS t2_resource_id,
                                                           t2.property_id                           AS t2_property_id,
                                                           t2.local_name                            AS t2_local_name,
                                                           t2.value_resource_id                     AS t2_value_resource_id,
                                                           t2.value                                 AS t2_value,
                                                           caratterizzazione_base.resource_id       AS caratterizzazione_base_resource_id,
                                                           caratterizzazione_base.property_id       AS caratterizzazione_base_property_id,
                                                           caratterizzazione_base.local_name        AS caratterizzazione_base_local_name,
                                                           caratterizzazione_base.value_resource_id AS caratterizzazione_base_value_resource_id,
                                                           caratterizzazione_base.value             AS caratterizzazione_base_value,
                                                           tipi.resource_id                         AS tipi_resource_id,
                                                           tipi.property_id                         AS tipi_property_id,
                                                           tipi.local_name                          AS tipi_local_name,
                                                           tipi.value_resource_id                   AS tipi_value_resource_id,
                                                           tipi.value                               AS tipi_value,
                                                           tipoiri.resource_id                      AS tipoiri_resource_id,
                                                           tipoiri.property_id                      AS tipoiri_property_id,
                                                           tipoiri.local_name                       AS tipoiri_local_name,
                                                           tipoiri.value_resource_id                AS tipoiri_value_resource_id,
                                                           tipoiri.value                            AS tipoiri_value,
                                                           nometipo.resource_id                     AS nometipo_resource_id,
                                                           nometipo.property_id                     AS nometipo_property_id,
                                                           nometipo.local_name                      AS nometipo_local_name,
                                                           nometipo.value_resource_id               AS nometipo_value_resource_id,
                                                           nometipo.value                           AS nometipo_value
                                                    FROM tabella_unica t1
                                                             JOIN tabella_unica t2 ON t2.resource_id = t1.value_resource_id
                                                             JOIN tabella_unica caratterizzazione_base
                                                                  ON t1.resource_id = caratterizzazione_base.resource_id
                                                             JOIN tabella_unica tipi
                                                                  ON caratterizzazione_base.value_resource_id = tipi.resource_id
                                                             JOIN tabella_unica tipoiri ON tipi.value_resource_id = tipoiri.resource_id
                                                             JOIN tabella_unica nometipo ON tipoiri.value_resource_id = nometipo.resource_id
                                                    WHERE t2.value_resource_id IN (${string_ids})
                                                      and t1.local_name = "hasRelationshipsWithLociData"
                                                      and t2.local_name IN ('locusLocatedIn', 'locusIsPartOf')
                    
                                                    UNION ALL
                    
                                                    SELECT t1.resource_id,
                                                           t1.property_id,
                                                           t1.local_name,
                                                           t1.value_resource_id,
                                                           t1.value,
                                                           t2.resource_id                           AS t2_resource_id,
                                                           t2.property_id                           AS t2_property_id,
                                                           t2.local_name                            AS t2_local_name,
                                                           t2.value_resource_id                     AS t2_value_resource_id,
                                                           t2.value                                 AS t2_value,
                                                           caratterizzazione_base.resource_id       AS caratterizzazione_base_resource_id,
                                                           caratterizzazione_base.property_id       AS caratterizzazione_base_property_id,
                                                           caratterizzazione_base.local_name        AS caratterizzazione_base_local_name,
                                                           caratterizzazione_base.value_resource_id AS caratterizzazione_base_value_resource_id,
                                                           caratterizzazione_base.value             AS caratterizzazione_base_value,
                                                           tipi.resource_id                         AS tipi_resource_id,
                                                           tipi.property_id                         AS tipi_property_id,
                                                           tipi.local_name                          AS tipi_local_name,
                                                           tipi.value_resource_id                   AS tipi_value_resource_id,
                                                           tipi.value                               AS tipi_value,
                                                           tipoiri.resource_id                      AS tipoiri_resource_id,
                                                           tipoiri.property_id                      AS tipoiri_property_id,
                                                           tipoiri.local_name                       AS tipoiri_local_name,
                                                           tipoiri.value_resource_id                AS tipoiri_value_resource_id,
                                                           tipoiri.value                            AS tipoiri_value,
                                                           nometipo.resource_id                     AS nometipo_resource_id,
                                                           nometipo.property_id                     AS nometipo_property_id,
                                                           nometipo.local_name                      AS nometipo_local_name,
                                                           nometipo.value_resource_id               AS nometipo_value_resource_id,
                                                           nometipo.value                           AS nometipo_value
                                                    FROM tabella_unica t1
                                                             JOIN tabella_unica t2 ON t2.resource_id = t1.value_resource_id
                                                             JOIN RelationsCTE r ON r.resource_id = t2.value_resource_id
                                                             JOIN tabella_unica caratterizzazione_base
                                                                  ON t1.resource_id = caratterizzazione_base.resource_id
                                                             JOIN tabella_unica tipi
                                                                  ON caratterizzazione_base.value_resource_id = tipi.resource_id
                                                             JOIN tabella_unica tipoiri ON tipi.value_resource_id = tipoiri.resource_id
                                                             JOIN tabella_unica nometipo ON tipoiri.value_resource_id = nometipo.resource_id
                                                    WHERE t1.local_name = "hasRelationshipsWithLociData"
                                                      and t2.local_name IN ('locusLocatedIn', 'locusIsPartOf'))
                    SELECT *
                    FROM RelationsCTE;

                    `);*/


    var q = `CREATE TEMPORARY TABLE IF NOT EXISTS ${filter}_locus_list_type_name AS (
            SELECT distinct resource_id
            FROM (
                  SELECT t1.resource_id
                  FROM tabella_unica t1
                           LEFT JOIN tabella_unica t2 ON t2.resource_id = t1.value_resource_id
                           LEFT JOIN tabella_unica caratterizzazione_base ON t1.resource_id = caratterizzazione_base.resource_id
                           LEFT JOIN tabella_unica tipi ON caratterizzazione_base.value_resource_id = tipi.resource_id
                           LEFT JOIN tabella_unica tipoiri ON tipi.value_resource_id = tipoiri.resource_id
                           LEFT JOIN tabella_unica nometipo ON tipoiri.value_resource_id = nometipo.resource_id
                  WHERE FIND_IN_SET(t1.resource_id, (
                            SELECT GROUP_CONCAT(ID SEPARATOR ',') AS All_List
                            FROM (
                                     SELECT ID FROM LocusRelationships WHERE ID IN (${ids})
                                     UNION ALL
                                     SELECT DISTINCT Lista_id_connessi AS ID FROM LocusRelationships WHERE ID IN (${ids}) AND Lista_id_connessi <> ''
                                 ) AS CombinedResults
                        ))`;

    if (type !== "" && type !== null && type !== undefined) {
        q += `and caratterizzazione_base.local_name = "hasBasicCharacterizationData"
                    and tipi.local_name = "hasTypeData"
                    and tipoiri.local_name = "hasIRITypeData"
                    and nometipo.local_name = "typeName"`
    }

    q += `) AS luoghi`;

    if (type !== "" && type !== null && type !== undefined) {
        q += ` WHERE nometipo_value like "${type}"`
    }

    q += ');';

    queries.push(q);


    return queries;

}


function composeLocusOverTime(queries, ids, type, filter, locusOverTimeRelationshipsDictionary) {
    console.log("SONO IN composeLocusOverTime");

    //console.log(queries);
    //console.log(ids);
    //console.log(type);

    const string_ids = ids.join(', ');


    var list = ottieniValoriConnessi(ids, locusOverTimeRelationshipsDictionary);
    console.log("LIST");

    console.log(list);
    const list_string_ids = list.join(', ');

    //Tipo libero
    /*
    queries.push(`CREATE TEMPORARY TABLE IF NOT EXISTS ${filter}_locus_over_time_free_type AS
                    WITH RECURSIVE RelationsCTE AS (
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
                          -- Aggiunta della condizione per la ricorsione
                          AND t3.value_resource_id IN (${string_ids})
                    
                        UNION ALL
                    
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
                                 JOIN RelationsCTE r ON t3.value_resource_id = r.resource_id
                                 JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
                                 JOIN tabella_unica tipolibero ON tipi.value_resource_id = tipolibero.resource_id
                        WHERE t1.local_name = 'hasLocusOverTimeData'
                          AND t2.local_name = 'hasRelationshipsWithLociData'
                          AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf')
                    )
                    SELECT *
                    FROM RelationsCTE;
                    `);*/


    var q = `
    CREATE TEMPORARY TABLE IF NOT EXISTS ${filter}_locus_over_time_list_free_type AS
        SELECT t1.resource_id
        FROM tabella_unica t1
                 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
                 JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                 JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
                 JOIN tabella_unica tipolibero ON tipi.value_resource_id = tipolibero.resource_id
        WHERE t1.local_name = 'hasLocusOverTimeData'
          AND t2.local_name = 'hasRelationshipsWithLociData'
          AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf')
            AND FIND_IN_SET(t3.value_resource_id, (
            SELECT GROUP_CONCAT(ID SEPARATOR ',') AS All_List
            FROM (
                     SELECT ID FROM LocusOverTimeRelationships WHERE ID IN (${ids})
                     UNION ALL
                     SELECT DISTINCT Lista_id_connessi AS ID FROM LocusOverTimeRelationships WHERE ID IN (${ids}) AND Lista_id_connessi <> ''
                 ) AS CombinedResults
        ))
                `;

    if (type !== "" && type !== null && type !== undefined) {
        q += ` AND tipolibero.value like "${type}"`
    }

    q += ';';

    queries.push(q);


    //Nome tipo
    /*
    queries.push(`CREATE TEMPORARY TABLE IF NOT EXISTS ${filter}_locus_over_time_type_name AS
                WITH RECURSIVE RelationsCTE AS (
                    SELECT t1.resource_id, t1.property_id, t1.local_name, t1.value_resource_id, t1.value,
                           t2.resource_id AS t2_resource_id, t2.property_id AS t2_property_id,
                           t2.local_name AS t2_local_name, t2.value_resource_id AS t2_value_resource_id, t2.value AS t2_value,
                           t3.resource_id AS t3_resource_id, t3.property_id AS t3_property_id,
                           t3.local_name AS t3_local_name, t3.value_resource_id AS t3_value_resource_id, t3.value AS t3_value,
                           tipi.resource_id AS tipi_resource_id, tipi.property_id AS tipi_property_id,
                           tipi.local_name AS tipi_local_name, tipi.value_resource_id AS tipi_value_resource_id, tipi.value AS tipi_value,
                           tipoiri.resource_id AS tipoiri_resource_id, tipoiri.property_id AS tipoiri_property_id,
                           tipoiri.local_name AS tipoiri_local_name, tipoiri.value_resource_id AS tipoiri_value_resource_id, tipoiri.value AS tipoiri_value,
                           nometipo.resource_id AS nometipo_resource_id, nometipo.property_id AS nometipo_property_id,
                           nometipo.local_name AS nometipo_local_name, nometipo.value_resource_id AS nometipo_value_resource_id, nometipo.value AS nometipo_value
                    FROM tabella_unica t1
                             JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
                             JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                             JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
                             JOIN tabella_unica tipoiri ON tipi.value_resource_id = tipoiri.resource_id
                             JOIN tabella_unica nometipo ON tipoiri.value_resource_id = nometipo.resource_id
                
                    WHERE t1.local_name = 'hasLocusOverTimeData'
                      AND t2.local_name = 'hasRelationshipsWithLociData'
                      AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf')
                      -- Aggiunta della condizione per la ricorsione
                      AND t3.value_resource_id IN (${string_ids})
                
                    UNION ALL
                
                    SELECT t1.resource_id, t1.property_id, t1.local_name, t1.value_resource_id, t1.value,
                           t2.resource_id AS t2_resource_id, t2.property_id AS t2_property_id,
                           t2.local_name AS t2_local_name, t2.value_resource_id AS t2_value_resource_id, t2.value AS t2_value,
                           t3.resource_id AS t3_resource_id, t3.property_id AS t3_property_id,
                           t3.local_name AS t3_local_name, t3.value_resource_id AS t3_value_resource_id, t3.value AS t3_value,
                           tipi.resource_id AS tipi_resource_id, tipi.property_id AS tipi_property_id,
                           tipi.local_name AS tipi_local_name, tipi.value_resource_id AS tipi_value_resource_id, tipi.value AS tipi_value,
                           tipoiri.resource_id AS tipoiri_resource_id, tipoiri.property_id AS tipoiri_property_id,
                           tipoiri.local_name AS tipoiri_local_name, tipoiri.value_resource_id AS tipoiri_value_resource_id, tipoiri.value AS tipoiri_value,
                           nometipo.resource_id AS nometipo_resource_id, nometipo.property_id AS nometipo_property_id,
                           nometipo.local_name AS nometipo_local_name, nometipo.value_resource_id AS nometipo_value_resource_id, nometipo.value AS nometipo_value
                    FROM tabella_unica t1
                             JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
                             JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                             JOIN RelationsCTE r ON t3.value_resource_id = r.resource_id
                             JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
                             JOIN tabella_unica tipoiri ON tipi.value_resource_id = tipoiri.resource_id
                             JOIN tabella_unica nometipo ON tipoiri.value_resource_id = nometipo.resource_id
                    WHERE t1.local_name = 'hasLocusOverTimeData'
                      AND t2.local_name = 'hasRelationshipsWithLociData'
                      AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf')
                )
                SELECT *
                FROM RelationsCTE;

                    `);
*/

    var q = `
                CREATE TEMPORARY TABLE IF NOT EXISTS ${filter}_locus_over_time_list_type_name AS
                SELECT t1.resource_id
        FROM tabella_unica t1
                 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id
                 JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id
                 JOIN tabella_unica tipi ON t1.value_resource_id = tipi.resource_id
                 JOIN tabella_unica tipoiri ON tipi.value_resource_id = tipoiri.resource_id
                 JOIN tabella_unica nometipo ON tipoiri.value_resource_id = nometipo.resource_id
    
        WHERE t1.local_name = 'hasLocusOverTimeData'
          AND t2.local_name = 'hasRelationshipsWithLociData'
          AND t3.local_name IN ('locusLocatedIn', 'locusIsPartOf')
          AND FIND_IN_SET(t3.value_resource_id, (
            SELECT GROUP_CONCAT(ID SEPARATOR ',') AS All_List
            FROM (
                     SELECT ID FROM LocusOverTimeRelationships WHERE ID IN (${ids})
                     UNION ALL
                     SELECT DISTINCT Lista_id_connessi AS ID FROM LocusOverTimeRelationships WHERE ID IN (${ids}) AND Lista_id_connessi <> ''
                 ) AS CombinedResults
        ))
    `;


    if (type !== "" && type !== null && type !== undefined) {
        q += ` AND nometipo.value like "${type}"`
    }

    q += ';';

    queries.push(q);

    return queries;

}

module.exports = {
    composeLocusQuery,
    composeLocusRelationships,
    composeLocusOverTime,
}