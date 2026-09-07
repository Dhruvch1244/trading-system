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
    private final String[] allowedOriginPatterns;

    // Patterns (supports "*" wildcards), not exact origins - so the frontend can be opened
    // from any device on the LAN (http://192.168.x.x:4200, http://10.x.x.x:4200, etc.) without
    // needing to know every teammate's IP ahead of time. Still scoped to port 4200 and private
    // address ranges by default - see CORS_ALLOWED_ORIGINS in .env to lock this down further.
    public WebConfig(
            CurrentAccount.Resolver currentAccountResolver,
            @Value("${trading.cors.allowed-origins}") String allowedOriginPatterns) {
        this.currentAccountResolver = currentAccountResolver;
        this.allowedOriginPatterns = allowedOriginPatterns.split(",");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentAccountResolver);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(allowedOriginPatterns)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
