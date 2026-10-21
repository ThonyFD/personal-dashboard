# **Blueprint Técnico y Funcional: Réplica y Extensión Inteligente de Azton**

Este documento sirve como especificación técnica compacta y de contexto directo para Modelos de Lenguaje Grande (LLMs). Define la estructura modular, el esquema de datos relacional y la arquitectura de agentes necesarios para construir las funciones base de hábitos de **Azton** y evolucionarlas hacia un sistema dinámico guiado por IA.

## ---

**1\. Módulo Core: Motor de Hábitos y Línea de Tiempo (Timeline)**

Gestiona el ciclo de vida diario de los hábitos, segmentando la jornada y controlando los estados de ejecución de manera estructurada.

### **1.1 Funcionalidades Detalladas**

* **Bloques del Día (Day Blocks):** División de la jornada en tres ventanas temporales configurables: MORNING (Mañana), AFTERNOON (Tarde) y EVENING (Noche). Cada bloque actúa como contenedor de hábitos asignados.  
* **Catálogo de Plantillas (Predefined Library):** Diccionario estático de hábitos preconfigurados clasificados por categorías (Salud, Mente, Productividad). Incluye configuraciones base de duración, iconos y colores.  
* **Gestión de Hábitos Personalizados (CRUD):** Registro de hábitos propios definiendo días de recurrencia mediante máscaras binarias, alarmas y duraciones objetivo.  
* **Modo Enfoque (Focus Timer):** Interfaz inmersiva con temporizador regresivo o cronómetro para registrar la duración exacta del hábito en ejecución (actual\_duration\_minutes).

### **1.2 Esquema de Base de Datos Relacional (SQL)**

`-- Catálogo estático de hábitos base`  
`CREATE TABLE habit_templates (`  
    `id VARCHAR(36) PRIMARY KEY,`  
    `name VARCHAR(100) NOT NULL,`  
    `category VARCHAR(50) NOT NULL, -- 'Salud', 'Mente', 'Productividad'`  
    `default_duration_minutes INT DEFAULT 5,`  
    `icon_identifier VARCHAR(50),`  
    `color_hex VARCHAR(7) -- Formato Hexadecimal #000000`  
`);`

`-- Hábitos activos del usuario`  
`CREATE TABLE user_habits (`  
    `id VARCHAR(36) PRIMARY KEY,`  
    `user_id VARCHAR(36) NOT NULL,`  
    `template_id VARCHAR(36), -- Opcional, si hereda de una plantilla`  
    `name VARCHAR(100) NOT NULL,`  
    `day_block VARCHAR(20) NOT NULL, -- 'MORNING', 'AFTERNOON', 'EVENING'`  
    `frequency_type VARCHAR(20) NOT NULL, -- 'DAILY', 'WEEKDAYS', 'CUSTOM'`  
    `custom_days_mask INT DEFAULT 127, -- Máscara de bits (7 bits para L-D, ej: 62 para L-V)`  
    `target_duration_minutes INT NOT NULL,`  
    `is_active BOOLEAN DEFAULT TRUE,`  
    `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`  
    `FOREIGN KEY (template_id) REFERENCES habit_templates(id)`  
`);`

`-- Logs diarios de ejecución`  
`CREATE TABLE habit_logs (`  
    `id VARCHAR(36) PRIMARY KEY,`  
    `user_habit_id VARCHAR(36) NOT NULL,`  
    `log_date DATE NOT NULL,`  
    `status VARCHAR(20) NOT NULL, -- 'COMPLETED', 'SKIPPED', 'PARTIAL'`  
    `actual_duration_minutes INT DEFAULT 0,`  
    `completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`  
    `FOREIGN KEY (user_habit_id) REFERENCES user_habits(id),`  
    `CONSTRAINT unique_habit_day UNIQUE (user_habit_id, log_date)`  
`);`

## ---

**2\. Módulo de Onboarding y Diagnóstico Psicológico**

Punto de entrada diseñado para mitigar la fricción inicial perfilando al usuario conductualmente.

### **2.1 Funcionalidades Detalladas**

* **Cuestionario Inicial:** Captura lineal de métricas del usuario (niveles de estrés, metas principales, mayores distractores).  
* **Motor de Arquetipos:** Clasificación automática basados en reglas puntuales para determinar el perfil del usuario (ej: *El Procrastinador Exhausto*).  
* **Inicialización Automatizada:** Escritura automatizada en la tabla user\_habits con un set de 3 hábitos por defecto alineados a su arquetipo para evitar un dashboard vacío en el primer login.

## ---

**3\. Módulo de Bienestar y Rastreador de Estado de Ánimo (Mood Tracker)**

Espacio cualitativo diario para registrar emociones y síntomas, permitiendo cruzar datos con el nivel de completado físico de hábitos.

### **3.1 Funcionalidades Detalladas**

* **Selector de Humor (Mood Picker):** Input diario mapeado en escala numérica del 1 (Crítico) al 5 (Excelente).  
* **Micro-Journaling:** Campo abierto de texto limitado (máx. 280 caracteres) para añadir contexto inmediato al humor declarado.  
* **Mapeo de Síntomas y Disparadores (Tags):** Selección múltiple de etiquetas estandarizadas de salud o entorno (ej: Insomnio, Estrés Laboral, Cafeína).

### **3.2 Esquema de Base de Datos Relacional (SQL)**

`-- Registro diario de humor`  
`CREATE TABLE mood_logs (`  
    `id VARCHAR(36) PRIMARY KEY,`  
    `user_id VARCHAR(36) NOT NULL,`  
    `log_date DATE NOT NULL,`  
    `mood_score INT NOT NULL, -- Escala 1 a 5`  
    `journal_text TEXT,`  
    `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`  
    `CONSTRAINT unique_user_mood_day UNIQUE (user_id, log_date)`  
`);`

`-- Diccionario global de etiquetas`  
`CREATE TABLE mood_tags (`  
    `id VARCHAR(36) PRIMARY KEY,`  
    `name VARCHAR(50) NOT NULL,`  
    `category VARCHAR(36) -- 'PHYSICAL_SYMPTOM', 'EXTERNAL_TRIGGER'`  
`);`

`-- Relación N:M entre logs de humor y etiquetas`  
`CREATE TABLE mood_log_tags (`  
    `mood_log_id VARCHAR(36) NOT NULL,`  
    `tag_id VARCHAR(36) NOT NULL,`  
    `PRIMARY KEY (mood_log_id, tag_id),`  
    `FOREIGN KEY (mood_log_id) REFERENCES mood_logs(id),`  
    `FOREIGN KEY (tag_id) REFERENCES mood_tags(id)`  
`);`

## ---

**4\. Módulo de Gamificación, Retención y Analítica**

* **Lógica de Rachas (Streaks):** Contador acumulativo de días consecutivos donde el porcentaje de hábitos completados obligatorios alcanza el 100%. Rompe la racha si al cambiar el día el log queda vacío o explícitamente en SKIPPED.  
* **Mapa de Calor (Heatmap):** Agrupación por días de la densidad de hábitos logrados, estructurado para renderizar cuadrículas mensuales de consistencia.

## ---

**5\. Blueprint de Arquitectura de Agentes LLM**

### **5.1 Agente 1: Onboarding Conversacional (Function Calling)**

Reemplazar los formularios fijos de preguntas por un diálogo empático de 3 turnos. El LLM extrae los objetivos implícitos y debe estructurar los parámetros necesarios para ejecutar la creación automática de la rutina base.

### **5.2 Agente 2: Planificador Dinámico Context-Aware**

Adaptar la carga del día según el estado bio-emocional del usuario. Al registrarse un mood\_score inferior a 3 acompañado de tags de fatiga o estrés, el backend dispara este agente pasándole el estado actual y las metas de hoy. El LLM devuelve un plan modificado a la baja junto con una notificación push personalizada.

### **5.3 Agente 3: Crítica Analítica y Reporte de Correlaciones**

El LLM recibe el dump consolidado de habit\_logs y mood\_logs. Su tarea es buscar patrones cruzados y redactar conclusiones narrativas de alto impacto conductual.
