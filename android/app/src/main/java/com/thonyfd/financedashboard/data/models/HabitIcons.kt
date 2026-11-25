package com.thonyfd.financedashboard.data.models

data class HabitIcon(val id: String, val emoji: String, val label: String)

data class HabitIconCategory(val name: String, val icons: List<HabitIcon>)

object HabitIcons {
    const val DEFAULT_ID = "focus"
    private const val FALLBACK_EMOJI = "✦"

    val categories: List<HabitIconCategory> = listOf(
        HabitIconCategory(
            "Salud",
            listOf(
                HabitIcon("water", "💧", "Agua"),
                HabitIcon("pill", "💊", "Medicina"),
                HabitIcon("sleep", "😴", "Dormir"),
                HabitIcon("bed", "🛏️", "Cama"),
                HabitIcon("teeth", "🪥", "Dientes"),
                HabitIcon("shower", "🚿", "Ducha"),
                HabitIcon("skincare", "🧴", "Skincare"),
                HabitIcon("heart", "❤️", "Corazón"),
                HabitIcon("weight", "⚖️", "Peso"),
                HabitIcon("sun", "☀️", "Sol")
            )
        ),
        HabitIconCategory(
            "Ejercicio",
            listOf(
                HabitIcon("walk", "🚶", "Caminar"),
                HabitIcon("run", "🏃", "Correr"),
                HabitIcon("gym", "🏋️", "Gym"),
                HabitIcon("bike", "🚴", "Bici"),
                HabitIcon("swim", "🏊", "Nadar"),
                HabitIcon("stretch", "🧘", "Estirar"),
                HabitIcon("muscle", "💪", "Fuerza"),
                HabitIcon("soccer", "⚽", "Fútbol"),
                HabitIcon("tennis", "🎾", "Tenis"),
                HabitIcon("steps", "👟", "Pasos")
            )
        ),
        HabitIconCategory(
            "Comida",
            listOf(
                HabitIcon("salad", "🥗", "Ensalada"),
                HabitIcon("fruit", "🍎", "Fruta"),
                HabitIcon("veggie", "🥦", "Verduras"),
                HabitIcon("cook", "🍳", "Cocinar"),
                HabitIcon("coffee", "☕", "Café"),
                HabitIcon("tea", "🍵", "Té"),
                HabitIcon("no_sugar", "🚫", "Sin azúcar"),
                HabitIcon("protein", "🥚", "Proteína")
            )
        ),
        HabitIconCategory(
            "Mente",
            listOf(
                HabitIcon("meditate", "🧠", "Meditar"),
                HabitIcon("pray", "🙏", "Orar"),
                HabitIcon("journal", "✍️", "Diario"),
                HabitIcon("gratitude", "🌻", "Gratitud"),
                HabitIcon("breathe", "🌬️", "Respirar"),
                HabitIcon("no_phone", "📵", "Sin móvil"),
                HabitIcon("smile", "😊", "Ánimo"),
                HabitIcon("nature", "🌿", "Naturaleza")
            )
        ),
        HabitIconCategory(
            "Aprender",
            listOf(
                HabitIcon("book", "📚", "Leer"),
                HabitIcon("study", "🎓", "Estudiar"),
                HabitIcon("language", "🗣️", "Idioma"),
                HabitIcon("code", "💻", "Programar"),
                HabitIcon("music", "🎸", "Música"),
                HabitIcon("art", "🎨", "Arte"),
                HabitIcon("podcast", "🎧", "Podcast"),
                HabitIcon("write", "📝", "Escribir")
            )
        ),
        HabitIconCategory(
            "Productividad",
            listOf(
                HabitIcon("focus", "🎯", "Foco"),
                HabitIcon("plan", "🗂️", "Planear"),
                HabitIcon("calendar", "📅", "Agenda"),
                HabitIcon("check", "✅", "Tarea"),
                HabitIcon("email", "📧", "Correo"),
                HabitIcon("clean", "🧹", "Limpiar"),
                HabitIcon("laundry", "🧺", "Ropa"),
                HabitIcon("plant", "🪴", "Plantas"),
                HabitIcon("pet", "🐶", "Mascota"),
                HabitIcon("timer", "⏱️", "Timer")
            )
        ),
        HabitIconCategory(
            "Finanzas",
            listOf(
                HabitIcon("money", "💰", "Ahorro"),
                HabitIcon("card", "💳", "Tarjeta"),
                HabitIcon("chart", "📈", "Inversión"),
                HabitIcon("budget", "🧾", "Presupuesto"),
                HabitIcon("piggy", "🐷", "Alcancía")
            )
        ),
        HabitIconCategory(
            "Social",
            listOf(
                HabitIcon("family", "👨‍👩‍👧", "Familia"),
                HabitIcon("call", "📞", "Llamar"),
                HabitIcon("friends", "🤝", "Amigos"),
                HabitIcon("love", "💞", "Pareja"),
                HabitIcon("gift", "🎁", "Detalle")
            )
        )
    )

    private val byId: Map<String, String> = categories
        .flatMap { it.icons }
        .associate { it.id to it.emoji }

    /**
     * Resuelve un identificador a emoji. Acepta ids del catálogo o un emoji directo
     * (para íconos personalizados escritos por el usuario).
     */
    fun resolve(identifier: String?): String {
        val raw = identifier?.trim().orEmpty()
        if (raw.isEmpty()) return FALLBACK_EMOJI
        byId[raw]?.let { return it }
        return if (raw.any { Character.isLetterOrDigit(it) && it.code < 128 }) FALLBACK_EMOJI else raw
    }
}
