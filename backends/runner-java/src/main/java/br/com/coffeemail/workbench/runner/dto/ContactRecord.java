package br.com.coffeemail.workbench.runner.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.jspecify.annotations.Nullable;

/** Resumo de contato. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ContactRecord(String id, String email, @Nullable String firstName, @Nullable String lastName, String createdAt) {}
