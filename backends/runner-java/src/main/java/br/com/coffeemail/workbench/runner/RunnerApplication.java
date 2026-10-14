package br.com.coffeemail.workbench.runner;

import br.com.coffeemail.workbench.runner.dto.RunnerError;
import br.com.coffeemail.workbench.runner.dto.RunnerInfo;
import br.com.coffeemail.workbench.runner.dto.StandardResponse;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.javalin.Javalin;
import io.javalin.http.HttpStatus;
import io.javalin.json.JavalinJackson;
import java.util.Optional;

/** Runner Java do Workbench, porta 4005 por padrão (variável {@code PORT}). */
public final class RunnerApplication {

    private static final int DEFAULT_PORT = 4005;

    private RunnerApplication() {}

    public static void main(final String[] args) {
        final int port = Optional.ofNullable(System.getenv("PORT"))
                .filter(value -> value.matches("\\d{1,5}"))
                .map(Integer::parseInt)
                .orElse(DEFAULT_PORT);
        create(ClientFactory.standard()).start(port);
    }

    public static Javalin create(final ClientFactory clients) {
        final RunnerRoutes routes = new RunnerRoutes(new RunnerService(clients));
        return Javalin.create(config -> {
            config.jsonMapper(new JavalinJackson(
                    JsonMapper.builder()
                            .addModule(new Jdk8Module())
                            .addModule(new JavaTimeModule())
                            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                            .build(),
                    false));
            config.bundledPlugins.enableCors(cors -> cors.addRule(rule -> rule.anyHost()));
            routes.register(config.routes);
            config.routes.exception(Exception.class, (exception, ctx) -> ctx.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json(new StandardResponse<>(
                            false,
                            new RunnerInfo("java", "Java " + Runtime.version(), RunnerService.info().sdkVersion(), "degraded"),
                            0,
                            null,
                            new RunnerError(
                                    "INTERNAL_SERVER_ERROR",
                                    Optional.ofNullable(exception.getMessage()).orElse("Erro interno inesperado"),
                                    HttpStatus.INTERNAL_SERVER_ERROR.getCode(),
                                    null))));
        });
    }
}
