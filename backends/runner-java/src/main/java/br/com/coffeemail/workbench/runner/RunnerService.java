package br.com.coffeemail.workbench.runner;

import br.com.coffeemail.CoffeeMail;
import br.com.coffeemail.CoffeeMailResponse;
import br.com.coffeemail.workbench.runner.dto.RunnerError;
import br.com.coffeemail.workbench.runner.dto.RunnerInfo;
import br.com.coffeemail.workbench.runner.dto.StandardResponse;
import java.time.Duration;
import java.util.function.Function;

/** Executa operações do SDK e as embrulha no envelope padrão, com o tempo de execução. */
public final class RunnerService {

    static final String MISSING_API_KEY = "Chave de API não informada. Defina a API Key no cabeçalho do Workbench"
            + " para executar operações no SDK.";
    static final String EXECUTION_ERROR = "RUNNER_EXECUTION_ERROR";
    static final int EXECUTION_ERROR_STATUS = 500;

    private final ClientFactory clients;

    public RunnerService(final ClientFactory clients) {
        this.clients = clients;
    }

    public static RunnerInfo info() {
        return new RunnerInfo("java", "Java " + Runtime.version(), CoffeeMail.version(), "online");
    }

    public java.util.Optional<CoffeeMail> client(final RequestContext context) {
        return clients.create(context);
    }

    public <T> StandardResponse<T> execute(
            final RequestContext context, final Function<CoffeeMail, CoffeeMailResponse<T>> operation) {
        final long start = System.nanoTime();
        return clients.create(context)
                .map(client -> operation.apply(client)
                        .<StandardResponse<T>>fold(
                                data -> success(data, start), error -> failure(error.getMessage(), start)))
                .orElseGet(() -> failure(MISSING_API_KEY, start));
    }

    public static <T> StandardResponse<T> success(final T data, final long start) {
        return new StandardResponse<>(true, info(), elapsedMillis(start), data, null);
    }

    public static <T> StandardResponse<T> failure(final String message, final long start) {
        return new StandardResponse<>(
                false,
                info(),
                elapsedMillis(start),
                null,
                new RunnerError(EXECUTION_ERROR, message, EXECUTION_ERROR_STATUS, null));
    }

    private static long elapsedMillis(final long start) {
        return Duration.ofNanos(System.nanoTime() - start).toMillis();
    }
}
