# Backend NodeJS - Revisualizing Italian Silentscapes 1896-1922 (RevIS)

Questo repository contiene il codice del Backend NodeJS del progetto **Revisualizing Italian Silentscapes 1896-1922 (RevIS)**, il quale permette alla webapp di fruire un catalogo di Film e di Luoghi e scoprire come quest'ultimi sono cambiati nel tempo, grazie alle varie riprese fatte nel corso degli anni.

# Deployment

## Setup

Per poter eseguire correttamente il progetto occorre installare:
- **Node JS** `v10.19.0`
- **PM2 - Process Manager for Node.js Applications** `5.3.0`


### PM2 - Process Manager for Node.js Applications

PM2 è uno strumento di gestione di processi avanzato progettato per applicazioni Node.js. Consente di gestire l'esecuzione delle tue applicazioni in modo affidabile, garantendo che siano sempre in esecuzione e disponibili.

***Caratteristiche principali***:

- **Avvio automatico:** PM2 può essere configurato per avviare automaticamente le tue applicazioni Node.js all'avvio del sistema, garantendo che siano disponibili dopo un riavvio del server.

- **Monitoraggio avanzato:** Fornisce un monitoraggio dettagliato delle tue applicazioni, inclusi log di output, utilizzo della CPU e della memoria, nonché altre informazioni utili per il debug e il monitoraggio delle prestazioni.

- **Gestione multi-applicazione:** Con PM2, è possibile gestire più applicazioni Node.js contemporaneamente, semplificando la gestione di diversi servizi o microservizi su un singolo server.

- **Aggiornamenti senza interruzioni:** Consente di eseguire aggiornamenti delle applicazioni senza tempi di inattività, garantendo una disponibilità continua dei servizi.

**Gestire le applicazioni con PM2:**
- Visualizzare elenco di applicazioni: `pm2 list`
- Eseguire un server dando un nome: `pm2 start <file-js>.js --name <nome server>`
- Arrestare il server: `pm2 stop <nome_server>`
- Riavviare il server: `pm2 restart <nome_server>`

# Esecuzione server

## Operazioni preliminari
Per poter eseguire il codice è necessario posizionarsi nella cartella `/var/silentscapes/test_nginx` da terminale ed eseguire il comando **npm install** per installare tutte le dipendenze necessarie per una corretta esecuzione del progetto.

## Esecuzione con PM2

Eseguire il server con pm2 permette di poter lasciare il server in esecuzione anche dopo aver chiuso il terminale.

Come prima cosa è necessari posizionarsi nella cartella `/var/silentscapes/test_nginx`.

Per eseguire il server connesso al sottodominio ***omeka***:
`NODE_ENV=production pm2 start server.js --name server_prod`

Per eseguire il server connesso al sottodominio ***omekadev***: `NODE_ENV=development pm2 start server.js --name server_dev`

Grazie al valore di `NODE_ENV` il codice esegue il server su una porta differente e fa si che prenda i dati dall'istanza di OmekaS corretta.

## Esecuzione standard
Per poter eseguire il codice senza usare PM2 è necessario posizionarsi nella cartella `/var/silentscapes/test_nginx` e usare il comando: `NODE_ENV=development node server.js`

## Dettagli
All'avvio il server esegue delle operazioni preliminari che richiedono diverso tempo al fine di creare diverse tabelle di appoggio per avere tutti i dati necessari per soddisfare in modo rapido le richieste.

Il server è pronto ad accettare delle richieste non appena stampa la stringa `Server in ascolto sulla porta <portNumber>`.

Ogni giorno alle 3 di notte il server aggiorna le tabelle create in moto tale da avere anche i dati aggiunti e poterli rendere disponibili.
Durante questo processo di aggiornamento il server non è in grado di rispondere ad eventuali richieste che riceve, ma una volta concluso riprende in automatico ad accettare e soddisfare le richieste.