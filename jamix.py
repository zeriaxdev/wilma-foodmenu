# Esimerkki tulostaa Gradian 23.01.2024 tarjolla olleen menun JSON tiedot.
import jamixapi
pvm = "20240123"
print(jamixapi.haeRuokaLista(pvm, "96773", "12"))