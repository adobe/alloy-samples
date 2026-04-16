import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  defaultTheme,
  Provider as SpectrumProvider,
  View,
  Heading,
  Grid,
  Text,
  Flex,
  Divider,
  Image,
} from "@adobe/react-spectrum";
import { z } from "zod";
import "./office-list.css";
import { McpAppProvider, useToolOutput } from "../../mcp-app";
import { useAlloy } from "../../resources";

const OfficeCard = ({ office }) => {
  const imageSize = 300;
  const imageUrl = `https://picsum.photos/seed/${office.id}/${imageSize}`;

  return (
    <View
      borderWidth="thin"
      borderColor="gray-300"
      borderRadius="medium"
      overflow="hidden"
      backgroundColor="gray-50"
    >
      <View width="space-200" height={`${imageSize}px`}>
        <Image src={imageUrl} alt={office.name} objectFit="cover" />
      </View>
      <View padding="size-200">
        <Heading level={3} marginBottom="size-50">
          {office.name}
        </Heading>
        <Text marginBottom="size-100">
          <strong>Location:</strong> {office.location}
        </Text>
        <Text marginBottom="size-150">{office.description}</Text>
        <Divider size="S" marginBottom="size-150" />
        <Text>
          <strong>Amenities:</strong>
        </Text>
        <Flex gap="size-100" wrap marginTop="size-50" marginBottom="size-150">
          {office.amenities.map((amenity) => (
            <View
              key={amenity}
              backgroundColor="gray-200"
              paddingX="size-100"
              paddingY="size-50"
              borderRadius="small"
            >
              <Text UNSAFE_style={{ fontSize: "0.875rem" }}>{amenity}</Text>
            </View>
          ))}
        </Flex>
        <Text
          UNSAFE_style={{
            fontSize: "0.875rem",
            color: "var(--spectrum-global-color-gray-700)",
          }}
        >
          <strong>Phone:</strong> {office.phone}
        </Text>
      </View>
    </View>
  );
};

const PromoBannerSchema = z.object({
  type: z.literal("promo-banner"),
  headline: z.string(),
  body: z.string(),
  cta: z
    .object({
      label: z.string(),
      officeId: z.string(),
    })
    .optional(),
});

const JSON_CONTENT_ITEM_SCHEMA =
  "https://ns.adobe.com/personalization/json-content-item";

const getPromoBanners = (handles) => {
  if (!handles) return [];
  return handles
    .filter((h) => h.type === "personalization:decisions")
    .flatMap((h) => h.payload ?? [])
    .flatMap((decision) => decision.items ?? [])
    .filter((item) => item.schema === JSON_CONTENT_ITEM_SCHEMA)
    .flatMap((item) => {
      const result = PromoBannerSchema.safeParse(item.data?.content);
      if (!result.success) {
        console.warn("[office-list] Invalid promo-banner:", result.error.issues);
        return [];
      }
      return [result.data];
    });
};

const PromoBanner = ({ content }) => (
  <View
    backgroundColor="blue-100"
    padding="size-200"
    borderRadius="medium"
    marginBottom="size-300"
  >
    <Heading level={3} marginBottom="size-50">
      {content.headline}
    </Heading>
    <Text>{content.body}</Text>
  </View>
);

const App = () => {
  /** @type {import("datastore").Office[]} */
  const output = useToolOutput();
  const alloy = useAlloy();

  useEffect(() => {
    if (alloy && output?._adobe?.handles) {
      alloy("applyResponse", {
        renderDecisions: false,
        responseBody: {
          handle: output._adobe.handles,
        },
      })
        .then(() =>
          alloy("sendEvent", {
            xdm: {
              identityMap: output._adobe.identityMap,
              eventType: "web.webPageDetails.pageViews",
              web: {
                webPageDetails: {
                  name: "Office List",
                },
              },
            },
          }),
        )
        .catch((error) => {
          console.error("[alloy] Failed to apply response:", error);
        });
    }
  }, [alloy, output?._adobe?.handles]);

  if (!output?.offices) {
    return (
      <View padding="size-250">
        <Heading level={1}>Adobe Offices</Heading>
        <Text>Loading offices...</Text>
      </View>
    );
  }
  const { offices } = output;
  const promoBanners = getPromoBanners(output._adobe?.handles);

  return (
    <View padding="size-250">
      <Heading level={1} marginBottom="size-300">
        Adobe Offices
      </Heading>
      {promoBanners.map((content, i) => (
        <PromoBanner key={i} content={content} />
      ))}
      <Grid
        columns={{
          base: ["1fr"],
          M: ["1fr", "1fr"],
          L: ["1fr", "1fr", "1fr"],
        }}
        gap="size-300"
      >
        {offices.map((office) => (
          <OfficeCard key={office.id} office={office} />
        ))}
      </Grid>
    </View>
  );
};

export default App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <McpAppProvider>
      <SpectrumProvider theme={defaultTheme}>
        <App />
      </SpectrumProvider>
    </McpAppProvider>
  </StrictMode>,
);
