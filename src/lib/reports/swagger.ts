import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
    const spec = createSwaggerSpec({
        apiFolder: "src/app/api", // define api folder under app directory
        definition: {
            openapi: "3.0.0",
            info: {
                title: "RoyaltyRadar API",
                version: "1.0",
                description: "Public and Internal API documentation for the RoyaltyRadar platform.",
            },
            components: {
                securitySchemes: {
                    BearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                    },
                },
            },
            security: [],
        },
    });
    return spec;
};
