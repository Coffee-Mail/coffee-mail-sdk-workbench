plugins {
    application
}

repositories {
    mavenCentral()
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

dependencies {
    implementation("br.com.coffeemail:coffeemail-java:0.1.0")
    implementation("io.javalin:javalin:7.2.3")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.22.3")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jdk8:2.22.3")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.22.3")
    compileOnly("org.jspecify:jspecify:1.0.1")
    runtimeOnly("org.slf4j:slf4j-simple:2.0.17")

    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("org.assertj:assertj-core:3.27.7")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

application {
    mainClass = "br.com.coffeemail.workbench.runner.RunnerApplication"
}

tasks.withType<JavaCompile>().configureEach {
    options.release = 17
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf("-Xlint:all,-processing", "-Werror"))
}

tasks.test {
    useJUnitPlatform()
}
