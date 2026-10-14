package br.com.coffeemail.workbench.runner;

import java.util.List;
import java.util.function.Consumer;
import org.jspecify.annotations.Nullable;

/** Conversões explícitas de campos opcionais dos DTOs de entrada para valores não nulos. */
final class Nullables {

    private Nullables() {}

    static String orEmpty(final @Nullable String value) {
        return value == null ? "" : value;
    }

    static <T> List<T> orEmpty(final @Nullable List<T> value) {
        return value == null ? List.of() : value;
    }

    static void ifPresent(final @Nullable String value, final Consumer<String> action) {
        if (value != null) {
            action.accept(value);
        }
    }

    static boolean isPresent(final @Nullable String value) {
        return value != null && !value.isBlank();
    }
}
