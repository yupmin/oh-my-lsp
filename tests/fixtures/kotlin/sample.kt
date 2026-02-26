class Greeter {
    fun add(a: Int, b: Int): Int {
        return a + b
    }
}

fun main() {
    val greeter = Greeter()
    val result = greeter.add(1, 2)
    println(result)
}
