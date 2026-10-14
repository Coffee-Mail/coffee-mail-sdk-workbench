// Command runner-go implementa o Runner API do Workbench sobre o SDK Go da
// CoffeeMail. Ouve na porta 4004 (variável PORT) e recebe a chave de API por
// requisição no header x-coffeemail-api-key; o runner não guarda credenciais.
package main
