plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

rootProject.name = "workbench-runner-java"

val localSdk = file("../../../coffee-mail-sdk-java")
if (localSdk.isDirectory) {
    includeBuild(localSdk)
}
