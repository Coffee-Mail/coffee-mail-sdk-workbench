package br.com.coffeemail.workbench.runner;

import br.com.coffeemail.CoffeeMail;
import br.com.coffeemail.CoffeeMailBuilder;
import br.com.coffeemail.CoffeeMailLocale;
import java.util.Optional;
import java.util.function.UnaryOperator;

/** Cria um cliente do SDK por requisição a partir das credenciais recebidas. */
public final class ClientFactory {

    private final UnaryOperator<CoffeeMailBuilder<CoffeeMail>> customizer;

    public ClientFactory(final UnaryOperator<CoffeeMailBuilder<CoffeeMail>> customizer) {
        this.customizer = customizer;
    }

    public static ClientFactory standard() {
        return new ClientFactory(UnaryOperator.identity());
    }

    public Optional<CoffeeMail> create(final RequestContext context) {
        if (context.apiKey().isBlank()) {
            return Optional.empty();
        }
        final CoffeeMailBuilder<CoffeeMail> builder =
                CoffeeMail.builder().apiKey(context.apiKey()).locale(CoffeeMailLocale.PT_BR);
        return Optional.of(customizer.apply(builder).build());
    }
}
