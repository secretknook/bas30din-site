# WhatsApp booking form (Flow)

- Flow "clinic_book_day_v2", ID 2403430777095215, on WhatsApp account 2004662500167719. Validated by Meta (no errors), status DRAFT.
- Publishing is blocked by Meta: "Integrity requirements not met" until the business is verified (business.facebook.com > Security Center).
- To switch it on after verification: publish the flow in WhatsApp Manager > Flows, then add `"bookFlowId": "2403430777095215"` to the Clinic Settings node of "Clinic Booking Bot - V2".
- With it on: patient picks a day -> the form opens with that day's free times as chips, Myself / Someone else, name, age, gender chips, phone, area, problem -> one tap books, sends the confirmation and the PDF receipt.
- Without it: Myself / Someone else buttons -> name (typed, only for someone else) -> gender buttons -> age (typed number).
