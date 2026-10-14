package br.com.coffeemail.workbench.runner.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.jspecify.annotations.Nullable;

/** Resumo de domínio. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DomainRecord(String id, String name, String status, @Nullable String dkimSelector, @Nullable String createdAt) {}
