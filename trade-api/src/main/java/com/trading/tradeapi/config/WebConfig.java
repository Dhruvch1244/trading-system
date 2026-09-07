package com.trading.tradeapi.config;

import com.trading.tradeapi.web.CurrentAccount;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final CurrentAccount.Resolver currentAccountResolver;
    private final String[] allowedOrigins;

    public WebConfig(
            CurrentAccount.Resolver currentAccountResolver,
            @Value("${trading.cors.allowed-origins}") String allowedOrigins) {
        this.currentAccountResolver = currentAccountResolver;
        this.allowedOrigins = allowedOrigins.split(",");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentAccountResolver);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
