# Online Job Fair - UML Diagrams

These diagrams cover only the original requirements (O1-O9):

1. The system shall allow a user to register by specifying the name, telephone number, email, and password.
2. After registration, the user becomes a registered user, and the system shall allow the user to log in to use the system by specifying the email and password. The system shall allow a registered user to log out.
3. After login, the system shall allow the registered user to book up to 3 interview sessions by specifying the date (during May 10th-13th, 2022) and the preferred companies. The company list is also provided to the user. A company information includes the company name, address, website, description, and telephone number.
4. The system shall allow the registered user to view his interview session bookings.
5. The system shall allow the registered user to edit his interview session bookings.
6. The system shall allow the registered user to delete his interview session bookings.
7. The system shall allow the admin to view any interview session bookings.
8. The system shall allow the admin to edit any interview session bookings.
9. The system shall allow the admin to delete any interview session bookings.

The following additional requirements are deliberately excluded: representative registration and approval, representative session management, candidate views, participant capacity, check-in, booking-status updates, and representative-account management.

## Files

| File | Purpose |
| --- | --- |
| `use-case-original-requirements.puml` | System actors and original functional requirements. |
| `class-original-requirements.puml` | Domain class diagram / UML profile. |
| `sequence-create-booking.puml` | Detailed O3 booking sequence, using the `client -> server -> router -> controller -> model -> MongoDB` structure from `VacQ_puml`. |

## Render locally in VS Code

Install the `PlantUML` extension by `jebbs` in VS Code. The extension is the local editor/preview tool; it requires Java and Graphviz on macOS:

```bash
brew install --cask temurin
brew install graphviz
```

Open a `.puml` file and press `Option+D` (`Alt+D` on some keyboards) to preview it. If the extension asks for a renderer, choose `Local`. To export a slide-ready SVG, use `Cmd+Shift+P` and choose `PlantUML: Export Current Diagram`.

SVG is recommended for slides because it stays sharp when enlarged. If local rendering is unavailable, set the extension renderer to `PlantUMLServer` temporarily, or use the extension's built-in server preview.

The PlantUML sources are the authoritative deliverables, so labels and constraints can be updated without redrawing images.
