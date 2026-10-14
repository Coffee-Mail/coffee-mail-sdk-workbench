package br.com.coffeemail.workbench.runner.dto;

import org.jspecify.annotations.Nullable;

/** Cadastro de domínio. */
public record CreateDomainRequest(@Nullable String name) {}
