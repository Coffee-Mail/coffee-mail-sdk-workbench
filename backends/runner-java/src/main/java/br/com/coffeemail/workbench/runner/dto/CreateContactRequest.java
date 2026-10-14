package br.com.coffeemail.workbench.runner.dto;

import org.jspecify.annotations.Nullable;

/** Cadastro de contato. */
public record CreateContactRequest(@Nullable String email, @Nullable String firstName, @Nullable String lastName) {}
