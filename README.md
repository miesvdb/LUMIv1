# Lumi — Budget opnieuw opgebouwd

Deze versie bouwt voort op de laatste Lumi-versie, maar de budgetlogica is opnieuw gestructureerd.

## Budget
- Eén bron van waarheid: losse transacties.
- Geen aparte `spent`-totalen meer die kunnen afwijken.
- **Nog uit te geven** = totaal inkomen − vaste lasten − variabele uitgaven − gereserveerd sparen.
- **Uitgaven** = vaste lasten + alle uitgaventransacties van de gekozen maand.
- Extra inkomsten worden automatisch bij het totaal inkomen opgeteld.
- Uitgaven hebben nu omschrijving, categorie, bedrag én datum.
- Je kunt door maanden bladeren.
- Categorie-uitgaven worden automatisch uit transacties van die maand berekend.
- Transacties kunnen worden aangepast of verwijderd.
- De homepage gebruikt exact dezelfde berekening als de Budget-tab.
- De zesmaandengrafiek gebruikt voor iedere maand het huidige vaste inkomen en de huidige vaste lasten als basis.

## Sparen
- Maandelijks spaardoel blijft beschikbaar.
- Nieuwe lange-termijn spaardoelen met:
  - eigen naam
  - zelfgekozen doelbedrag
  - zelfgekozen doeldatum/termijn
  - voortgang
  - resterend bedrag
  - inleg toevoegen
  - doel bewerken/verwijderen
- Werkelijke inleg in spaardoelen wordt apart bijgehouden.
- Om dubbel aftrekken te voorkomen reserveert Lumi in een maand het hoogste van:
  - je ingestelde maandelijkse spaardoel, of
  - wat je die maand daadwerkelijk hebt ingelegd.

## Migratie
- Oude demo-transacties met IDs 101–104 worden eenmalig verwijderd.
- Oude categorie-`spent` waarden worden niet meer gebruikt.
- Bestaande echte transacties blijven bewaard en worden waar mogelijk van categorie/omschrijving voorzien.

Cache-key: `lumi-budget-rebuild-1`
