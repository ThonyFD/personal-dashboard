package com.thonyfd.financedashboard.data.repository

/** Pending items first, completed at the bottom; the original order is kept inside each group. */
fun <T> List<T>.pendingFirst(isCompleted: (T) -> Boolean): List<T> = sortedBy(isCompleted)
