function composeLocusQuery(objectFilters) {
    console.log("COMPOSE FILM TITLE!!");

    var query = `CREATE TEMPORARY TABLE IF NOT EXISTS tabella_unica AS
                SELECT v.resource_id, v.property_id, p.local_name, v.value_resource_id, v.value
                FROM value v
                         JOIN property p ON v.property_id = p.id;
                `;

    var query_parts = [false, false, false, false];

    //Altre entità mostrate
    if (objectFilters.otherEntitiesType !== '' && objectFilters.otherEntitiesType !== null) {
        const otherEntities = `
                #Seleziona le Rappresentazioni luogo che hanno il nome tipo selezionato
                SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id JOIN tabella_unica t4 ON t3.value_resource_id = t4.resource_id  WHERE t1.local_name = "hasOtherShownEntitiesData" and t2.local_name = "hasTypeData" and t3.local_name = "hasIRITypeData" and t4.local_name = "typeName" and t4.value = "${objectFilters.otherEntitiesType}"
                UNION
                #Seleziona le Rappresentazioni luogo che hanno il tipo libero selezionato
                SELECT t1.resource_id from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id JOIN tabella_unica t3 ON t2.value_resource_id = t3.resource_id WHERE t1.local_name = "hasOtherShownEntitiesData" and t2.local_name = "hasTypeData" and t3.local_name = "type" and t3.value = "${objectFilters.otherEntitiesType}";
                \n`;

        query += otherEntities;
        query_parts[0] = true;
    }

    if (objectFilters.ucCastMemberName !== '' && objectFilters.ucCastMemberName !== null) {
        if (query_parts[0]) {
            query += '\n INTERSECT \n'
        }

        const titleTextFilmTitle = `
            #Seleziona le Rappresentazioni luogo che hanno una certa persona presente (si guarda sia il campo interprete sia il campo personaggio)
            SELECT * from tabella_unica t1 JOIN tabella_unica t2 ON t1.value_resource_id = t2.resource_id WHERE t1.local_name = "hasPresentPersonData" and t2.local_name IN ("presentPersonCastMemberName", "presentPersonCharacterName") and t2.value LIKE "%${objectFilters.ucCastMemberName}%";
            \n`;

        query += titleTextFilmTitle;
        query_parts[1] = true;
    }

    /*
    if (objectFilters.titleTypeFilmTitle !== '' && objectFilters.titleTypeFilmTitle !== null) {
        if (query_parts[0] || query_parts[1]) {
            query += '\n INTERSECT \n';
        }

        const titleTypeFilmTitle = `
        SELECT * FROM 
            (
            SELECT v1.resource_id
            FROM (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "hasFilmTitle"
            ) AS v1
            JOIN (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "titleType" AND v.value = '${objectFilters.titleTypeFilmTitle}'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as tipo_titolo\n`;

        query += titleTypeFilmTitle;
        query_parts[2] = true;
    }

    if (objectFilters.titleOtherCharacterizationFilmTitle !== '' && objectFilters.titleOtherCharacterizationFilmTitle !== null) {
        if (query_parts[0] || query_parts[1] || query_parts[2]) {
            query += '\n INTERSECT \n';
        }

        const titleOtherCharacterizationFilmTitle = `
        SELECT * FROM 
            (
            SELECT v1.resource_id
            FROM (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "hasFilmTitle"
            ) AS v1
            JOIN (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "otherTitleCharacterization" AND v.value LIKE '%${objectFilters.titleOtherCharacterizationFilmTitle}%'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as altra_caratterizzazione_titolo\n`;

        query += titleOtherCharacterizationFilmTitle;
        query_parts[3] = true;
    }*/

    query += 'DROP TEMPORARY TABLE IF EXISTS tabella_unica;';


    return query;
}

module.exports = {
    composeLocusQuery,
}