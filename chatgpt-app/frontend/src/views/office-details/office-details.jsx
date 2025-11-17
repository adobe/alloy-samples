import React, { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  Heading,
  defaultTheme,
  Provider as SpectrumProvider,
  View,
  Text,
  Flex,
  Divider,
  TextField,
  Image,
  ToastQueue,
  ToastContainer,
} from "@adobe/react-spectrum";
import "./office-details.css";
import { useToolOutput, useTool } from "../../openai-hooks";
import { useAlloy } from "../../resources";

const App = () => {
  /** @type {import("datastore").Office} */
  const output = useToolOutput();
  const requestVisit = useTool("request-visit");
  const alloy = useAlloy();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (alloy && output?.office) {
      alloy("sendEvent", {
        xdm: {
          eventType: "web.webpagedetails.pageViews",
          web: {
            webPageDetails: {
              name: `Office Details - ${output.office.name}`,
              pageViews: {
                value: 1,
              },
            },
          },
          _adobe: {
            office: {
              id: output.office.id,
              name: output.office.name,
              city: output.office.city,
              country: output.office.country,
            },
          },
        },
      }).catch((error) => {
        console.error("[alloy] Failed to send page view event:", error);
      });
    }
  }, [alloy, output?.office]);

  if (!output?.office) {
    return (
      <View padding="size-250">
        <Heading level={1}>Office Details</Heading>
        <Text>Loading office details...</Text>
      </View>
    );
  }

  const { office } = output;
  const imageSize = 400;
  const imageUrl = `https://picsum.photos/seed/${office.id}/${imageSize}`;

  const handleRequestTour = async () => {
    if (!email) {
      ToastQueue.negative("Please enter your email address");
      return;
    }

    setIsSubmitting(true);

    try {
      await requestVisit({ officeId: office.id, email });

      if (alloy) {
        alloy("sendEvent", {
          xdm: {
            eventType: "office.visit.request",
            web: {
              webPageDetails: {
                name: `Request Visit - ${office.name}`,
              },
            },
            _adobe: {
              office: {
                id: office.id,
                name: office.name,
                city: office.city,
                country: office.country,
              },
            },
          },
        }).catch((error) => {
          console.error("[alloy] Failed to send visit request event:", error);
        });
      }

      ToastQueue.positive("Tour request submitted successfully!");
      setEmail("");
    } catch (error) {
      ToastQueue.negative(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View padding="size-250">
      <Heading level={1} marginBottom="size-300">
        {office.name}
      </Heading>

      <View
        borderWidth="thin"
        borderColor="gray-300"
        borderRadius="medium"
        overflow="hidden"
        backgroundColor="gray-50"
        marginBottom="size-300"
      >
        <Flex width="100%" height="300px">
          <Image src={imageUrl} alt={office.name} objectFit="cover" />
        </Flex>
        <View padding="size-300">
          <Text marginBottom="size-100">
            <strong>Location:</strong> {office.location}
          </Text>
          <Text marginBottom="size-200">{office.description}</Text>

          <Divider size="S" marginY="size-200" />

          <Heading level={3} marginBottom="size-100">
            Amenities
          </Heading>
          <Flex gap="size-100" wrap marginBottom="size-200">
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
            marginBottom="size-300"
            UNSAFE_style={{
              fontSize: "0.875rem",
              color: "var(--spectrum-global-color-gray-700)",
            }}
          >
            <strong>Phone:</strong> {office.phone}
          </Text>

          <Divider size="S" marginY="size-200" />

          <Heading level={3} marginBottom="size-150">
            Request a Tour
          </Heading>
          <Flex direction="column" gap="size-150">
            <TextField
              label="Email Address"
              value={email}
              onChange={setEmail}
              type="email"
              isRequired
              width="100%"
            />
            <Button
              variant="cta"
              onPress={handleRequestTour}
              isDisabled={isSubmitting || !email}
            >
              {isSubmitting ? "Submitting..." : "Request Tour"}
            </Button>
          </Flex>
        </View>
      </View>
    </View>
  );
};

export default App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SpectrumProvider theme={defaultTheme}>
      <ToastContainer />
      <App />
    </SpectrumProvider>
  </StrictMode>
);
