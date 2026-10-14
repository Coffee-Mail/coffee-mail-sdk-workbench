package br.com.coffeemail.workbench.runner;

/**
 * Credenciais enviadas pela UI em cada requisição; o runner não guarda nenhuma.
 *
 * @param apiKey valor de {@code x-coffeemail-api-key}
 */
public record RequestContext(String apiKey) {}
