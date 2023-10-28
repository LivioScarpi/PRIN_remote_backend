function composeFilmTitle(objectFilters){
    console.log("COMPOSE FILM TITLE!!");

    var query = `SELECT * FROM (`;

    var title_parts = [false, false, false, false];
    if(objectFilters.titleTextFilmTitle !== '' && objectFilters.titleTextFilmTitle !== null) {
        const titleTextFilmTitle = `
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
              WHERE p.local_name = "titleText" AND v.value LIKE '%${objectFilters.titleTextFilmTitle}%'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as titolo_film\n`;

        query += titleTextFilmTitle;
        title_parts[0] = true;

    }

    if(objectFilters.titleLanguageFilmTitle !== '' && objectFilters.titleLanguageFilmTitle !== null) {
        if(title_parts[0]) {
            query += '\n INTERSECT \n'
        }

        const titleTextFilmTitle = `
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
              WHERE p.local_name = "titleLanguage" AND v.value = '${objectFilters.titleLanguageFilmTitle}'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as lingua_titolo\n`;

        query += titleTextFilmTitle;
        title_parts[1] = true;
    }

    if(objectFilters.titleTypeFilmTitle !== '' && objectFilters.titleTypeFilmTitle !== null) {
        if(title_parts[0] || title_parts[1]) {
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
        title_parts[2] = true;
    }

    if(objectFilters.titleOtherCharacterizationFilmTitle !== '' && objectFilters.titleOtherCharacterizationFilmTitle !== null) {
        if(title_parts[0] || title_parts[1] || title_parts[2]) {
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
        title_parts[3] = true;
    }

    query += ') AS titolo_film';

    console.log("QUERY");
    console.log(query);

    return query;
}

function composeSerieTitle(objectFilters){
    console.log("COMPOSE SERIE TITLE!!");

    var query = `SELECT * FROM (`;

    var title_parts = [false, false, false, false];
    if(objectFilters.titleTextSerieTitle !== '' && objectFilters.titleTextSerieTitle !== null) {
        const titleTextSerieTitle = `
        SELECT * FROM 
            (
            SELECT v1.resource_id
            FROM (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "hasSeriesTitle"
            ) AS v1
            JOIN (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "titleText" AND v.value LIKE '%${objectFilters.titleTextSerieTitle}%'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as titolo_serie\n`;

        query += titleTextSerieTitle;
        title_parts[0] = true;

    }

    if(objectFilters.titleLanguageSerieTitle !== '' && objectFilters.titleLanguageSerieTitle !== null) {
        if(title_parts[0]) {
            query += '\n INTERSECT \n'
        }

        const titleLanguageSerieTitle = `
        SELECT * FROM 
            (
            SELECT v1.resource_id
            FROM (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "hasSeriesTitle"
            ) AS v1
            JOIN (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "titleLanguage" AND v.value = '${objectFilters.titleLanguageSerieTitle}'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as lingua_titolo\n`;

        query += titleLanguageSerieTitle;
        title_parts[1] = true;
    }

    if(objectFilters.titleTypeSerieTitle !== '' && objectFilters.titleTypeSerieTitle !== null) {
        if(title_parts[0] || title_parts[1]) {
            query += '\n INTERSECT \n';
        }

        const titleTypeSerieTitle = `
        SELECT * FROM 
            (
            SELECT v1.resource_id
            FROM (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "hasSeriesTitle"
            ) AS v1
            JOIN (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "titleType" AND v.value = '${objectFilters.titleTypeSerieTitle}'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as tipo_titolo\n`;

        query += titleTypeSerieTitle;
        title_parts[2] = true;
    }

    if(objectFilters.titleOtherCharacterizationSerieTitle !== '' && objectFilters.titleOtherCharacterizationSerieTitle !== null) {
        if(title_parts[0] || title_parts[1] || title_parts[2]) {
            query += '\n INTERSECT \n';
        }

        const titleOtherCharacterizationSerieTitle = `
        SELECT * FROM 
            (
            SELECT v1.resource_id
            FROM (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "hasSeriesTitle"
            ) AS v1
            JOIN (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "otherTitleCharacterization" AND v.value LIKE '%${objectFilters.titleOtherCharacterizationSerieTitle}%'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as altra_caratterizzazione_titolo\n`;

        query += titleOtherCharacterizationSerieTitle;
        title_parts[3] = true;
    }

    query += ') AS titolo_serie';

    console.log("QUERY");
    console.log(query);

    return query;
}


function composeEpisodeSerieTitle(objectFilters){
    console.log("COMPOSE EPISODE SERIE TITLE!!");

    var query = `SELECT * FROM (`;

    var title_parts = [false, false, false, false];
    if(objectFilters.titleTextEpisodeSerieTitle !== '' && objectFilters.titleTextEpisodeSerieTitle !== null) {
        const titleTextEpisodeSerieTitle = `
        SELECT * FROM 
            (
            SELECT v1.resource_id
            FROM (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "hasSeriesEpisodeTitle"
            ) AS v1
            JOIN (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "titleText" AND v.value LIKE '%${objectFilters.titleTextEpisodeSerieTitle}%'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as titolo_episodio_serie\n`;

        query += titleTextEpisodeSerieTitle;
        title_parts[0] = true;

    }

    if(objectFilters.titleLanguageEpisodeSerieTitle !== '' && objectFilters.titleLanguageEpisodeSerieTitle !== null) {
        if(title_parts[0]) {
            query += '\n INTERSECT \n'
        }

        const titleLanguageEpisodeSerieTitle = `
        SELECT * FROM 
            (
            SELECT v1.resource_id
            FROM (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "hasSeriesEpisodeTitle"
            ) AS v1
            JOIN (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "titleLanguage" AND v.value = '${objectFilters.titleLanguageEpisodeSerieTitle}'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as lingua_titolo\n`;

        query += titleLanguageEpisodeSerieTitle;
        title_parts[1] = true;
    }

    if(objectFilters.titleTypeEpisodeSerieTitle !== '' && objectFilters.titleTypeEpisodeSerieTitle !== null) {
        if(title_parts[0] || title_parts[1]) {
            query += '\n INTERSECT \n';
        }

        const titleTypeEpisodeSerieTitle = `
        SELECT * FROM 
            (
            SELECT v1.resource_id
            FROM (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "hasSeriesEpisodeTitle"
            ) AS v1
            JOIN (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "titleType" AND v.value = '${objectFilters.titleTypeEpisodeSerieTitle}'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as tipo_titolo\n`;

        query += titleTypeEpisodeSerieTitle;
        title_parts[2] = true;
    }

    if(objectFilters.titleOtherCharacterizationEpisodeSerieTitle !== '' && objectFilters.titleOtherCharacterizationEpisodeSerieTitle !== null) {
        if(title_parts[0] || title_parts[1] || title_parts[2]) {
            query += '\n INTERSECT \n';
        }

        const titleOtherCharacterizationEpisodeSerieTitle = `
        SELECT * FROM 
            (
            SELECT v1.resource_id
            FROM (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "hasSeriesEpisodeTitle"
            ) AS v1
            JOIN (
              SELECT v.resource_id, v.value_resource_id, v.value
              FROM value v
              JOIN property p ON v.property_id = p.id
              WHERE p.local_name = "otherTitleCharacterization" AND v.value LIKE '%${objectFilters.titleOtherCharacterizationEpisodeSerieTitle}%'
            ) AS v2
            ON v1.value_resource_id = v2.resource_id
            ) as altra_caratterizzazione_titolo\n`;

        query += titleOtherCharacterizationEpisodeSerieTitle;
        title_parts[3] = true;
    }

    query += ') AS titolo_episodio_serie';

    console.log("QUERY");
    console.log(query);

    return query;
}

function composeTitle(objectFilters){
    var query = `SELECT * FROM (\n`;
    var title_parts = [false, false, false, false];

    if(checkFilmTitle(objectFilters)) {
        filmTitleQuery = composeFilmTitle(objectFilters);

        query += filmTitleQuery;
        title_parts[0] = true;
    }

    if(checkSerieTitle(objectFilters)) {

        if(title_parts[0]){
            query += "\nINTERSECT\n";
        }

        serieTitleQuery = composeSerieTitle(objectFilters);

        query += serieTitleQuery;
        title_parts[1] = true;
    }

    if(checkEpisodeSerieTitle(objectFilters)) {

        if(title_parts[0] || title_parts[1]){
            query += "\nINTERSECT\n";
        }

        episodeSerieTitleQuery = composeEpisodeSerieTitle(objectFilters);

        query += episodeSerieTitleQuery;
        title_parts[2] = true;
    }

    if(objectFilters.copyTitleText !== '' && objectFilters.copyTitleText !== null) {

        if(title_parts[0] || title_parts[1] || title_parts[2]){
            query += "\nINTERSECT\n";
        }

        copyTitleQuery = composeCopyTitle(objectFilters);

        query += copyTitleQuery;
        title_parts[3] = true;
    }



    query += '\n) AS titolo';

    return query;
    //console.log("\n\n\n\nQUERY FINALE\n");
    //console.log(query);
}

function composeCopyTitle(objectFilters){
    console.log("COMPOSE COPY TITLE!!");

    var query = `SELECT * FROM (
                    SELECT film.value_resource_id FROM 
                    (
                    SELECT v1.resource_id
                    FROM (
                      SELECT v.resource_id, v.value_resource_id, v.value
                      FROM value v
                      JOIN property p ON v.property_id = p.id
                      WHERE p.local_name = "hasCopyTitle"
                    ) AS v1
                    JOIN (
                      SELECT v.resource_id, v.value_resource_id, v.value
                      FROM value v
                      JOIN property p ON v.property_id = p.id
                      WHERE p.local_name = "titleText" AND v.value LIKE "%${objectFilters.copyTitleText}%"
                    ) AS v2
                    ON v1.value_resource_id = v2.resource_id
                    ) as titolo_copia JOIN value film on titolo_copia.resource_id = film.resource_id left join property p on film.property_id = p.id 
                    where p.local_name = "hasLinkedFilmCatalogueRecord"
                    ) as film_titolo_copia
                    `;

    console.log("QUERY");
    console.log(query);

    return query;
}

function composeDirector(objectFilters){
    console.log("COMPOSE DIRECTOR DOVE SONO!!");

    var query = `SELECT * FROM
                    (
                    SELECT v1.resource_id
                    FROM value v1
                    WHERE v1.value_resource_id IN (
                      SELECT v2.resource_id
                      FROM value v2
                      JOIN property p ON v2.property_id = p.id
                      WHERE
                    `;

    var title_parts = [false, false];
    if(objectFilters.filmDirectorName !== '' && objectFilters.filmDirectorName !== null) {
        const directorName = `
        (p.local_name = "directorName" AND v2.value = "${objectFilters.filmDirectorName}")\n`;

        query += directorName;
        title_parts[0] = true;

    }

    if(objectFilters.filmDirectorOtherName !== '' && objectFilters.filmDirectorOtherName !== null) {
        if (title_parts[0]) {
            query += '\n OR \n'
        }

        const directorOtherName = `
        (p.local_name = "otherDirectorName" AND v2.value = "${objectFilters.filmDirectorOtherName}")\n`;

        query += directorOtherName;
        title_parts[1] = true;
    }

    query += ')) AS film_director';

    console.log("QUERY");
    console.log(query);

    return query;
}

function composeSubject(objectFilters){
    console.log("COMPOSE SUBJECT!!");

    var query = `SELECT * FROM
                (
                SELECT v1.resource_id
                FROM value v1
                WHERE v1.value_resource_id IN (
                  SELECT v2.resource_id
                  FROM value v2
                  JOIN property p ON v2.property_id = p.id
                  WHERE  v2.value_resource_id
                    IN (
                  SELECT v3.resource_id
                  FROM value v3
                  JOIN property p ON v3.property_id = p.id
                  WHERE 
                    (p.local_name = "originalStoryAuthorName" AND v3.value LIKE "%${objectFilters.filmSubject}%")
                    OR
                    (p.local_name = "otherOriginalStoryAuthorName" AND v3.value = "%${objectFilters.filmSubject}%")
                    OR
                    (p.local_name = "storySource" AND v2.value = "%${objectFilters.filmSubject}%")
                   )
                ) 
                ) as film_con_soggetto
                `;

    console.log("QUERY");
    console.log(query);

    return query;
}

function composeScreenwriter(objectFilters){
    console.log("COMPOSE SCREENWRITER!!");

    var query = `SELECT * FROM
                (
                SELECT v1.resource_id
                FROM value v1
                WHERE v1.value_resource_id IN (
                  SELECT v2.resource_id
                  FROM value v2
                  JOIN property p ON v2.property_id = p.id
                  WHERE 
                    (p.local_name = "screenwriterName" AND v2.value LIKE "%${objectFilters.filmScreenwriterName}%")
                    OR
                    (p.local_name = "otherScreenwriterName" AND v2.value = "%${objectFilters.filmScreenwriterName}%")
                ) 
                ) as film_con_sceneggiatura
                `;

    console.log("QUERY");
    console.log(query);

    return query;
}

function composeCredits(objectFilters){
    console.log("COMPOSE CREDITS!!");

    var query = `SELECT * FROM
                (
                SELECT v1.resource_id
                FROM value v1
                WHERE v1.value_resource_id IN (
                  SELECT v2.resource_id
                  FROM value v2
                  JOIN property p ON v2.property_id = p.id
                  WHERE 
                    (p.local_name = "cinematographerName" AND v2.value LIKE "%${objectFilters.filmCredits}%")
                    OR
                    (p.local_name = "editorName" AND v2.value = "%${objectFilters.filmCredits}%")
                    OR
                    (p.local_name = "setDesignerName" AND v2.value = "%${objectFilters.filmCredits}%")
                    OR
                    (p.local_name = "costumeDesignerName" AND v2.value = "%${objectFilters.filmCredits}%")
                    OR
                    (p.local_name = "specialEffectsManagerName" AND v2.value = "%${objectFilters.filmCredits}%")
                    OR
                    (p.local_name = "musicComposerName" AND v2.value = "%${objectFilters.filmCredits}%")
                ) 
                ) as film_con_credits
                `;

    console.log("QUERY");
    console.log(query);

    return query;
}


function composeProductionName(objectFilters){
    console.log("COMPOSE PRODUCTION NAME!!");

    var query = `SELECT * FROM
                (
                SELECT v1.resource_id
                FROM value v1
                WHERE v1.value_resource_id IN (
                  SELECT v2.resource_id
                  FROM value v2
                  JOIN property p ON v2.property_id = p.id
                  WHERE 
                    (p.local_name = "productionCompanyName" AND v2.value = "${objectFilters.filmProductionName}")
                ) 
                ) as film_con_produzione
                `;

    console.log("QUERY");
    console.log(query);

    return query;
}

function composeGenres(objectFilters){
    console.log("COMPOSE GENRES!!");

    var query = `SELECT * FROM
                (
                SELECT v1.resource_id
                FROM value v1
                WHERE v1.value_resource_id IN (
                  SELECT v2.resource_id
                  FROM value v2
                  JOIN property p ON v2.property_id = p.id
                  WHERE 
                    (p.local_name = "genre" AND v2.value = "${objectFilters.filmGenres[0]}")`

    if(objectFilters.filmGenres.length > 1){
        objectFilters.filmGenres.forEach((genre, index) => {

            if(index > 0){
                query += ` OR (p.local_name = "genre" AND v2.value = "${genre}")`
            }
        });
    }


    query+= `) 
                ) as film_con_generi
                `;

    console.log("QUERY");
    console.log(query);

    return query;
}

function composeProductionCountry(objectFilters){
    console.log("COMPOSE PRODUCTION COUNTRY!!");

    var query = `SELECT * FROM
                (
                SELECT v1.resource_id
                FROM value v1
                WHERE v1.value_resource_id IN (
                  SELECT v2.resource_id
                  FROM value v2
                  JOIN property p ON v2.property_id = p.id
                  WHERE 
                    (p.local_name = "productionCompanyCountry" AND v2.value = "${objectFilters.filmProductionCountry}")
                ) 
                ) as film_con_paese_produzione
                `;

    console.log("QUERY");
    console.log(query);

    return query;
}

function composeSynopsis(objectFilters){
    console.log("COMPOSE SYNOPSIS!!");

    var query = `SELECT * FROM
                (
                SELECT v1.resource_id
                FROM value v1
                WHERE v1.value_resource_id IN (
                  SELECT v2.resource_id
                  FROM value v2
                  JOIN property p ON v2.property_id = p.id
                  WHERE 
                    (p.local_name = "synopsis" AND v2.value LIKE "%${objectFilters.filmSynopsis}%")
                ) 
                ) as film_con_sinossi`;

    console.log("QUERY");
    console.log(query);

    return query;
}

function checkFilmTitle(objectFilters){
    return (objectFilters.titleTextFilmTitle !== '' && objectFilters.titleTextFilmTitle !== []) ||
        (objectFilters.titleTypeFilmTitle !== '' && objectFilters.titleTypeFilmTitle !== []) ||
        (objectFilters.titleLanguageFilmTitle !== '' && objectFilters.titleLanguageFilmTitle !== []) ||
        (objectFilters.titleOtherCharacterizationFilmTitle !== '' && objectFilters.titleOtherCharacterizationFilmTitle !== []);
}

function checkSerieTitle(objectFilters){
    return (objectFilters.titleTextSerieTitle !== '' && objectFilters.titleTextSerieTitle !== []) ||
        (objectFilters.titleTypeSerieTitle !== '' && objectFilters.titleTypeSerieTitle !== []) ||
        (objectFilters.titleLanguageSerieTitle !== '' && objectFilters.titleLanguageSerieTitle !== []) ||
        (objectFilters.titleOtherCharacterizationSerieTitle !== '' && objectFilters.titleOtherCharacterizationSerieTitle !== []);
}

function checkEpisodeSerieTitle(objectFilters){
    return (objectFilters.titleTextEpisodeSerieTitle !== '' && objectFilters.titleTextEpisodeSerieTitle !== []) ||
        (objectFilters.titleTypeEpisodeSerieTitle !== '' && objectFilters.titleTypeEpisodeSerieTitle !== []) ||
        (objectFilters.titleLanguageEpisodeSerieTitle !== '' && objectFilters.titleLanguageEpisodeSerieTitle !== []) ||
        (objectFilters.titleOtherCharacterizationEpisodeSerieTitle !== '' && objectFilters.titleOtherCharacterizationEpisodeSerieTitle !== []);
}

function checkTitle(objectFilters) {
    console.log("checkFilmTitle(objectFilters): " + checkFilmTitle(objectFilters));
    console.log("checkSerieTitle(objectFilters): " + checkSerieTitle(objectFilters));

    console.log("checkEpisodeSerieTitle(objectFilters): " + checkEpisodeSerieTitle(objectFilters));

    return checkFilmTitle(objectFilters) || checkSerieTitle(objectFilters) || checkEpisodeSerieTitle(objectFilters) || (objectFilters.copyTitleText !== '' && objectFilters.copyTitleText !== null) ;
}

function checkDirector(objectFilters) {
    return objectFilters.filmDirectorName !== '' || objectFilters.filmDirectorOtherName !== '';
}

function checkSubject(objectFilters) {
    return objectFilters.filmSubject !== '' && objectFilters.filmSubject !== null;
}

function checkScreenwriter(objectFilters) {
    return objectFilters.filmScreenwriterName !== '' && objectFilters.filmScreenwriterName !== null;
}

function checkCredits(objectFilters) {
    return objectFilters.filmCredits !== '' && objectFilters.filmCredits !== null;
}

function checkProductionName(objectFilters) {
    return objectFilters.filmProductionName !== '' && objectFilters.filmProductionName !== null;
}

function checkGenres(objectFilters) {
    return objectFilters.filmGenres !== [] && objectFilters.filmGenres !== null && objectFilters.filmGenres.length > 0;
}

function checkProductionCountry(objectFilters) {
    return objectFilters.filmProductionCountry !== '' && objectFilters.filmProductionCountry !== null;
}

function checkSynopsis(objectFilters) {
    return objectFilters.filmSynopsis !== '' && objectFilters.filmSynopsis !== null;
}

module.exports = {
    //Titolo
    checkTitle,
    composeTitle,

    //Regia
    checkDirector,
    composeDirector,

    //Soggetto,
    checkSubject,
    composeSubject,

    //Sceneggiatura
    checkScreenwriter,
    composeScreenwriter,

    //Crediti
    checkCredits,
    composeCredits,

    //Nome produzione
    checkProductionName,
    composeProductionName,

    //Generi
    checkGenres,
    composeGenres,

    //Paese produzione
    checkProductionCountry,
    composeProductionCountry,

    //Sinossi,
    checkSynopsis,
    composeSynopsis


};
