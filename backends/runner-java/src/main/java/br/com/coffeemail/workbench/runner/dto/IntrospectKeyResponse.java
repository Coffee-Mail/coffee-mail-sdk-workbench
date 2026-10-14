package br.com.coffeemail.workbench.runner.dto;

import java.util.List;

/** Resultado da introspecção da chave. */
public record IntrospectKeyResponse(boolean valid, String environment, List<String> permissions, String keyPreview) {}
