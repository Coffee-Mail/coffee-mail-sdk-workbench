package br.com.coffeemail.workbench.runner;

import java.util.Optional;

/**
 * Credenciais enviadas pela UI em cada requisição; o runner não guarda nenhuma.
 *
 * @param apiKey valor de {@code x-coffeemail-api-key}
 * @param baseUrl valor de {@code x-coffeemail-base-url}, quando informado
 */
public record RequestContext(String apiKey, Optional<String> baseUrl) {}
