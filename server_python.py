from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from urlparse import urlparse, parse_qs
#import spacy
import json

# Carica il modello linguistico italiano di spacy (assicurati di averlo scaricato prima)
#nlp = spacy.load('it_core_news_sm')

class MyRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)

        print("URL")
        print(parsed_url.path)

        if parsed_url.path == '/server_python2/get_root':
            if 'word' in query_params:
                word = query_params['word'][0]
                result = 'ciao a tutti' #get_root(word)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
            else:
                self.send_response(400)
                self.end_headers()
                self.wfile.write('Missing "word" parameter in the query string.')
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write('Endpoint not found.')

#def get_root(word):
    # Analizza la parola con spaCy
    #doc = nlp(word)
    
    # Estrae la radice della parola
    #root = doc[0].lemma_

    # Verifica se la parola e' al plurale
    #is_plural = doc[0].morph.get('Number') == 'Plur'

    # Costruisci il risultato come un dizionario JSON
    #result = {
    #    "word": word,
    #    "root": root,
    #    "is_plural": is_plural
    #}
    
    #return result

def run(server_class=HTTPServer, handler_class=MyRequestHandler, port=3005):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print ('Starting server on port %s...' % port)
    httpd.serve_forever()

if __name__ == '__main__':
    run()
