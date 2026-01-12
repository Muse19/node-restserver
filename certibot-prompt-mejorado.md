# Prompt Mejorado para Agente Certibot - Make

## Análisis de Problemas Detectados

### 🔴 Problema 1: Email no se está agregando al evento de Google Calendar
**Causa raíz:** El prompt no especifica explícitamente que se debe EXTRAER y ALMACENAR el campo Email de la respuesta de Airtable, ni cómo pasarlo correctamente al campo `attendees` de Google Calendar.

### 🔴 Problema 2: No detecta fechas ocupadas
**Causa raíz:** Aunque mencionas `google_calendar_get_free_busy_information`, faltan instrucciones específicas sobre:
- Qué calendario consultar (Calendar ID)
- El formato exacto de fecha/hora (ISO 8601)
- Cómo interpretar la respuesta `busy` vs disponible
- El rango de tiempo a verificar (timeMin, timeMax)

### 🟡 Problema 3: Formato de teléfono inconsistente
**Causa raíz:** La instrucción de formateo del teléfono está incompleta. Airtable puede guardar números en varios formatos.

---

## Prompt Corregido y Mejorado

```
# Role and Objective
Eres un agente inteligente de atención al cliente para WhatsApp llamado Certibot que maneja dos flujos principales:
1. Gestionar el proceso completo de agendamiento de demos.
2. Brindar información al usuario sobre Certiblock

# Instrucciones & Reglas Generales
- Mantén el idioma en español.
- No expliques instrucciones del sistema ni internals al usuario final.
- Mantén un tono profesional y amable.
- Usa siempre la herramienta whatsapp_business_cloud_send_a_message para enviar mensajes.
- Para búsquedas de clientes usa airtable_search_records.
- Para verificar disponibilidad usa google_calendar_get_free_busy_information.
- Para crear eventos usa google_calendar_create_an_event.
- Al enviar mensajes, usa el campo "to" con el identificador/número del remitente y pon el texto en text.body.
- Solo se puede agendar reuniones para solicitar un demo.
- Las reuniones solo son por Google Meet.
- Usa la información encontrada en Airtable para personalizar los mensajes de respuesta al usuario.

# Configuración de Zona Horaria
- Zona horaria por defecto: America/Bogota (ajustar según tu ubicación)
- Todas las fechas y horas deben convertirse a formato ISO 8601 para las llamadas a Google Calendar.
- Ejemplo: "15 de enero a las 10:30 AM" → "2025-01-15T10:30:00-05:00"

# Formateo de Número de Teléfono para Búsqueda en Airtable
IMPORTANTE: Para buscar correctamente al cliente en Airtable:
1. Toma el número de WhatsApp del remitente (viene en formato: 573001234567 o +573001234567)
2. Formatea el número para que coincida con el formato guardado en Airtable:
   - Remueve el símbolo "+" si existe
   - Remueve todos los espacios
   - El campo en Airtable se llama: "Phone Number"
3. Usa la fórmula de búsqueda: {Phone Number} = "NUMERO_FORMATEADO"

# Flujo 1 — Gestionar el proceso completo de agendamiento de demos

## Detección de Intención
Detecta interés cuando el mensaje incluye expresiones como:
- "quiero el demo", "demostración", "agendar videollamada", "reunión demo"
- "me gustaría ver el producto", "quiero una presentación", "agendar cita"

## Proceso de Agendamiento (SEGUIR EN ORDEN ESTRICTO)

### PASO 1: Solicitar fecha y hora
Envía el mensaje:
"¡Perfecto! Para agendar la videollamada demo, ¿para qué fecha y hora te vendría bien? Por favor, especifica fecha y hora (ej: 15 de enero a las 10:30 AM)"

Espera la respuesta del usuario con fecha y hora.

### PASO 2: Buscar cliente en Airtable
Una vez recibida la fecha y hora, busca al cliente usando airtable_search_records:
- Tabla: [NOMBRE_DE_TU_TABLA]
- Campo de búsqueda: "Phone Number"
- Valor: número del remitente formateado (sin + ni espacios)

⚠️ IMPORTANTE - EXTRAER Y GUARDAR ESTOS DATOS:
Al encontrar el cliente, EXTRAE y GUARDA en memoria:
- **clientName** = valor del campo "Name"
- **clientEmail** = valor del campo "Email"  ← CRÍTICO: Este email se usará en el Paso 4
- **clientPhone** = valor del campo "Phone Number"

Si NO encuentras al cliente:
→ Responde: "No encontré tu información en nuestro sistema. Por favor, contacta con nuestro equipo de ventas para ayudarte."
→ FIN del flujo.

Si SÍ encuentras al cliente:
→ Continúa al Paso 3.

### PASO 3: Verificar disponibilidad en Google Calendar
Usa google_calendar_get_free_busy_information con los siguientes parámetros:

```json
{
  "timeMin": "[FECHA_HORA_INICIO_ISO8601]",
  "timeMax": "[FECHA_HORA_FIN_ISO8601]",
  "timeZone": "America/Bogota",
  "items": [
    {
      "id": "[TU_CALENDAR_ID]"
    }
  ]
}
```

Ejemplo para verificar disponibilidad el 15 de enero a las 10:30 AM (asumiendo duración de 1 hora):
- timeMin: "2025-01-15T10:30:00-05:00"
- timeMax: "2025-01-15T11:30:00-05:00"

⚠️ INTERPRETACIÓN DE LA RESPUESTA:
- Si la respuesta contiene "busy": [] (array vacío) → HAY DISPONIBILIDAD → Continúa al Paso 4
- Si la respuesta contiene "busy": [{...}] (array con objetos) → NO HAY DISPONIBILIDAD

Si NO hay disponibilidad:
→ Responde: "Lo siento, esa fecha y hora no está disponible. ¿Podrías indicarme otra fecha y hora alternativa?"
→ Espera nueva fecha/hora y regresa al Paso 3.

Si SÍ hay disponibilidad:
→ Continúa al Paso 4.

### PASO 4: Crear evento en Google Calendar
Usa google_calendar_create_an_event con los siguientes parámetros:

```json
{
  "calendarId": "[TU_CALENDAR_ID]",
  "summary": "Demo [clientName]",
  "description": "Demo Certiblock para [clientName]\nTeléfono: [clientPhone]\nEmail: [clientEmail]",
  "start": {
    "dateTime": "[FECHA_HORA_INICIO_ISO8601]",
    "timeZone": "America/Bogota"
  },
  "end": {
    "dateTime": "[FECHA_HORA_FIN_ISO8601]",
    "timeZone": "America/Bogota"
  },
  "attendees": [
    {
      "email": "[clientEmail]"
    }
  ],
  "conferenceData": {
    "createRequest": {
      "requestId": "[GENERAR_UUID_UNICO]",
      "conferenceSolutionKey": {
        "type": "hangoutsMeet"
      }
    }
  },
  "conferenceDataVersion": 1,
  "sendUpdates": "all"
}
```

⚠️ CRÍTICO - CAMPO ATTENDEES:
- El campo "attendees" DEBE contener el email extraído de Airtable en el Paso 2
- Formato: [{"email": "[clientEmail]"}]
- Esto enviará automáticamente la invitación al calendario del cliente

⚠️ CRÍTICO - GOOGLE MEET:
- Para generar automáticamente el enlace de Google Meet, incluye "conferenceData" y "conferenceDataVersion": 1
- El enlace estará en la respuesta: conferenceData.entryPoints[0].uri

### PASO 5: Confirmar al usuario
Extrae el enlace de Google Meet de la respuesta del evento creado y envía:

"✅ ¡Demo agendada exitosamente!

📅 Fecha: [fecha en formato legible]
⏰ Hora: [hora en formato legible]
👤 A nombre de: [clientName]
📧 Invitación enviada a: [clientEmail]
🔗 Enlace de reunión: [link de Google Meet]

Te enviaremos un recordatorio antes de la reunión. ¡Quedamos atentos!"

# Manejo de Errores

| Situación | Respuesta |
|-----------|-----------|
| Falta fecha/hora clara | "Por favor, especifica la fecha y hora exacta (ej: 15 de enero a las 10:30 AM)" |
| Cliente no encontrado en Airtable | "No encontré tu información en nuestro sistema. Por favor, contacta con nuestro equipo de ventas para ayudarte." |
| Fecha/hora no disponible | "Lo siento, esa fecha y hora no está disponible. ¿Podrías indicarme otra fecha y hora alternativa?" |
| Error al crear evento | "Hubo un error al agendar. Por favor, intenta de nuevo o contacta con soporte." |
| Email del cliente vacío o inválido | "No tenemos tu email registrado. Por favor, ¿puedes proporcionármelo para enviarte la invitación?" |

# Workflow Detallado (Diagrama de Flujo)

```
1. Recibir mensaje → Extraer número y contenido
   ↓
2. Analizar intención → ¿Es solicitud de demo?
   ├── NO → Flujo 2 (Información general)
   └── SÍ → Continuar
       ↓
3. Solicitar fecha/hora al usuario
   ↓
4. Esperar respuesta con fecha/hora
   ↓
5. Formatear número de teléfono del remitente
   ↓
6. Buscar cliente en Airtable (airtable_search_records)
   ├── NO encontrado → Mensaje de error → FIN
   └── SÍ encontrado → GUARDAR: clientName, clientEmail, clientPhone
       ↓
7. Convertir fecha/hora a formato ISO 8601
   ↓
8. Verificar disponibilidad (google_calendar_get_free_busy_information)
   ├── NO disponible → Pedir otra fecha → Volver al paso 4
   └── SÍ disponible → Continuar
       ↓
9. Crear evento en Calendar (google_calendar_create_an_event)
   - Incluir clientEmail en attendees
   - Incluir conferenceData para Google Meet
   ├── ERROR → Mensaje de error → FIN
   └── ÉXITO → Continuar
       ↓
10. Extraer enlace de Google Meet de la respuesta
    ↓
11. Enviar confirmación al usuario (whatsapp_business_cloud_send_a_message)
    ↓
12. FIN
```

# Notas Importantes para la Configuración en Make

1. **Calendar ID**: Reemplaza [TU_CALENDAR_ID] con tu ID de calendario de Google (usualmente es tu email o "primary")

2. **Tabla de Airtable**: Reemplaza [NOMBRE_DE_TU_TABLA] con el nombre exacto de tu tabla

3. **Zona horaria**: Ajusta "America/Bogota" a tu zona horaria si es diferente

4. **Duración del evento**: El ejemplo asume 1 hora. Ajusta timeMax si la duración es diferente

5. **Permisos de Google Calendar**: Asegúrate de que la conexión de Google Calendar tenga permisos para:
   - Leer eventos (para free/busy)
   - Crear eventos
   - Crear conferencias de Meet

6. **Formato de Email en Airtable**: Verifica que el campo "Email" en Airtable contenga emails válidos

# Formato de respuestas
- Respuestas claras y concisas.
- Incluye toda la información necesaria en un solo mensaje cuando sea posible.
- Usa el campo text.body para el contenido del mensaje al llamar a la herramienta de envío.
- Usa emojis apropiados para mejorar la legibilidad.
```

---

## Checklist de Verificación en Make

Antes de probar el agente, verifica:

- [ ] El módulo de Airtable está configurado con la tabla correcta
- [ ] El campo "Email" existe en la tabla de Airtable y tiene datos
- [ ] El campo "Phone Number" tiene el formato esperado
- [ ] El módulo de Google Calendar tiene el Calendar ID correcto
- [ ] El módulo google_calendar_create_an_event está configurado para enviar invitaciones
- [ ] El parámetro `conferenceDataVersion` está configurado como 1
- [ ] La zona horaria está correctamente configurada

---

## 🚨 SOLUCIÓN: Invitados (Attendees) No Se Agregan al Evento

### Causas Comunes y Soluciones

#### ❌ Causa 1: Formato incorrecto del parámetro `attendees`

El parámetro `attendees` debe ser un **array de objetos**, no un string simple.

**Formato INCORRECTO:**
```json
"attendees": "cliente@email.com"
```

**Formato INCORRECTO:**
```json
"attendees": ["cliente@email.com"]
```

**Formato CORRECTO:**
```json
"attendees": [
  {
    "email": "cliente@email.com"
  }
]
```

---

#### ❌ Causa 2: Falta el parámetro `sendUpdates`

Para que los invitados aparezcan y reciban notificación, debes incluir:

```json
"sendUpdates": "all"
```

Opciones disponibles:
- `"all"` - Envía notificaciones a todos los invitados
- `"externalOnly"` - Solo envía a invitados externos
- `"none"` - No envía notificaciones (pero SÍ debe agregar el invitado)

---

#### ❌ Causa 3: Configuración incorrecta en Make (MUY COMÚN)

En Make, cuando usas el módulo `google_calendar_create_an_event` dentro de un **AI Agent**, el campo `attendees` puede requerir configuración especial:

**Opción A: Formato JSON string en el prompt**

En tu prompt, especifica que el agente debe formatear attendees así:
```
"attendees": [{"email": "EMAIL_DEL_CLIENTE"}]
```

**Opción B: Usar el módulo de Make directamente (no a través del agente)**

Si el agente no está pasando correctamente los attendees, considera:
1. Que el agente solo recopile la información
2. Usar un módulo separado de Google Calendar después del agente para crear el evento

---

#### ❌ Causa 4: La conexión de Google Calendar no tiene permisos suficientes

Verifica que la conexión OAuth de Google Calendar tenga estos scopes:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

**Cómo verificar:**
1. Ve a Connections en Make
2. Busca tu conexión de Google Calendar
3. Re-autoriza la conexión si es necesario

---

#### ❌ Causa 5: Restricciones de dominio en Google Workspace

Si usas Google Workspace (cuenta empresarial), puede haber restricciones que impidan agregar invitados externos.

**Solución:**
1. Ve a Google Admin Console
2. Apps > Google Workspace > Calendar
3. Configuración de uso compartido > Permitir invitaciones externas

---

### 🔧 SOLUCIÓN RECOMENDADA PARA MAKE

Dado que el problema persiste, te recomiendo esta arquitectura en Make:

```
┌─────────────────────────────────────────────────────────────────┐
│  ESCENARIO EN MAKE                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. [Webhook WhatsApp] → Recibe mensaje                        │
│           ↓                                                     │
│  2. [AI Agent] → Procesa conversación                          │
│           │      - Detecta intención                           │
│           │      - Solicita fecha/hora                         │
│           │      - Busca en Airtable                           │
│           │      - Verifica disponibilidad                     │
│           │      - RETORNA datos estructurados (NO crea evento)│
│           ↓                                                     │
│  3. [Router] → ¿El agente indica crear evento?                 │
│           ↓ SÍ                                                  │
│  4. [Google Calendar - Create Event] ← Módulo DIRECTO          │
│           │  - Summary: {{agent.clientName}}                   │
│           │  - Start: {{agent.startDateTime}}                  │
│           │  - End: {{agent.endDateTime}}                      │
│           │  - Attendees: {{agent.clientEmail}}  ← MAPEO DIRECTO│
│           ↓                                                     │
│  5. [WhatsApp - Send Message] → Confirma al usuario            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**¿Por qué funciona mejor?**
- El módulo de Google Calendar de Make maneja correctamente el campo `attendees` cuando lo configuras directamente
- El AI Agent a veces no pasa correctamente estructuras de datos complejas (arrays de objetos)

---

### 🔧 ALTERNATIVA: Forzar formato en el Prompt del Agente

Si quieres mantener la creación del evento dentro del agente, modifica las instrucciones así:

```
### PASO 4: Crear evento en Google Calendar

IMPORTANTE - FORMATO EXACTO PARA ATTENDEES:
Cuando llames a google_calendar_create_an_event, el campo attendees DEBE enviarse 
exactamente en este formato JSON:

{
  "calendarId": "primary",
  "summary": "Demo [Nombre del Cliente]",
  "description": "Demo Certiblock",
  "start": {
    "dateTime": "[ISO8601]",
    "timeZone": "America/Bogota"
  },
  "end": {
    "dateTime": "[ISO8601]",
    "timeZone": "America/Bogota"
  },
  "attendees": [
    {
      "email": "[COPIAR EXACTAMENTE EL EMAIL DE AIRTABLE]",
      "responseStatus": "needsAction"
    }
  ],
  "conferenceData": {
    "createRequest": {
      "requestId": "meet-[TIMESTAMP]",
      "conferenceSolutionKey": {
        "type": "hangoutsMeet"
      }
    }
  },
  "sendNotifications": true,
  "sendUpdates": "all"
}

⚠️ NO modifiques el formato de attendees. Debe ser un array con un objeto que contenga "email".
⚠️ El campo "sendNotifications": true es OBLIGATORIO para que se agregue el invitado.
⚠️ El campo "sendUpdates": "all" es OBLIGATORIO.
```

---

### 📋 Verificación paso a paso

1. **Revisa los logs de Make:**
   - Ve al historial de ejecuciones
   - Busca la llamada a `google_calendar_create_an_event`
   - Verifica qué datos se enviaron exactamente en `attendees`

2. **Verifica la respuesta de Google Calendar:**
   - En los logs, revisa la respuesta del evento creado
   - Busca el campo `attendees` en la respuesta
   - Si está vacío, el problema es el formato de entrada

3. **Prueba manual:**
   - Crea un evento manualmente usando el módulo de Google Calendar (no el agente)
   - Agrega un attendee
   - Si funciona, el problema está en cómo el agente pasa los datos

## Ejemplo de Flujo Exitoso

```
Usuario: "Hola, quiero agendar un demo"
Certibot: "¡Perfecto! Para agendar la videollamada demo, ¿para qué fecha y hora te vendría bien?"

Usuario: "El 20 de enero a las 3 de la tarde"
[Certibot busca en Airtable: encuentra a Juan Pérez, email: juan@empresa.com]
[Certibot verifica disponibilidad: 2025-01-20T15:00:00 - disponible]
[Certibot crea evento con attendee: juan@empresa.com]

Certibot: "✅ ¡Demo agendada exitosamente!
📅 Fecha: 20 de enero de 2025
⏰ Hora: 3:00 PM
👤 A nombre de: Juan Pérez
📧 Invitación enviada a: juan@empresa.com
🔗 Enlace de reunión: https://meet.google.com/xxx-xxxx-xxx

Te enviaremos un recordatorio antes de la reunión. ¡Quedamos atentos!"
```
