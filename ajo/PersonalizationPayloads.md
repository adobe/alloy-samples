## Personalization Payloads

### Proposition Fetch

```http request
curl --location 'https://edge.adobedc.net/ee/v1/interact?configId=0814ac07-ffeb-44c4-8633-85301d5e721c' \
--header 'Content-Type: application/json' \
--data '{
  "meta": {
    "configOverrides": {},
    "state": {
      "domain": "",
      "cookiesEnabled": true,
      "entries": [
        {
          "key": "kndctr_906E3A095DC834230A495FD6_AdobeOrg_identity",
          "value": "CiYwNzg4MjM1NzY5Nzg5NDk5Mjc1MTMwNzUxMzk5NDg4MDQ2NDcwOFIQCJO_79CpMRgBKgNPUjIwA_ABlbW5zKox"
        },
        {
          "key": "kndctr_906E3A095DC834230A495FD6_AdobeOrg_cluster",
          "value": "or2"
        }
      ]
    }
  },
  "events": [
    {
      "query": {
        "personalization": {
          "schemas": [
            "https://ns.adobe.com/personalization/default-content-item",
            "https://ns.adobe.com/personalization/html-content-item",
            "https://ns.adobe.com/personalization/json-content-item",
            "https://ns.adobe.com/personalization/redirect-item",
            "https://ns.adobe.com/personalization/dom-action"
          ],
          "surfaces": [
            "web://localhost/#sample-json-content"
          ]
        }
      },
      "xdm": {
        "web": {
          "webPageDetails": {
            "URL": "https://localhost/"
          },
          "webReferrer": {
            "URL": ""
          }
        },
        "device": {
          "screenHeight": 1120,
          "screenWidth": 1792,
          "screenOrientation": "landscape"
        },
        "environment": {
          "type": "browser",
          "browserDetails": {
            "viewportWidth": 1734,
            "viewportHeight": 320
          }
        },
        "placeContext": {
          "localTimezoneOffset": 420,
          "localTime": "2023-09-18T12:18:56.011-07:00"
        },
        "timestamp": "2023-09-18T19:18:56.011Z",
        "implementationDetails": {
          "name": "https://ns.adobe.com/experience/alloy",
          "version": "2.18.0",
          "environment": "browser"
        }
      }
    }
  ],
  "query": {
    "identity": {
      "fetch": [
        "ECID"
      ]
    }
  }
}'
```

### Proposition Response

```json
{
    "requestId": "ae82bef4-c8d2-4f37-94ae-69d4869506c1",
    "handle": [
        {
            "payload": [
                {
                    "id": "07882357697894992751307513994880464708",
                    "namespace": {
                        "code": "ECID"
                    }
                }
            ],
            "type": "identity:result"
        },
        {
            "payload": [
                {
                    "id": "084b5e2b-3c30-4d0b-a869-79e7b48793ab",
                    "scope": "web://localhost/#sample-json-content",
                    "scopeDetails": {
                        "decisionProvider": "AJO",
                        "correlationID": "6db4d58f-9341-44db-acce-98d75ed40863",
                        "strategies": [
                            {
                                "strategyID": "6lxiLqnWGfdnXhiPbXpzrT",
                                "treatmentID": "62e3619274"
                            }
                        ],
                        "characteristics": {
                            "eventToken": "eyJtZXNzYWdlRXhlY3V0aW9uIjp7Im1lc3NhZ2VFeGVjdXRpb25JRCI6Ik5BIiwibWVzc2FnZUlEIjoiNmRiNGQ1OGYtOTM0MS00NGRiLWFjY2UtOThkNzVlZDQwODYzIiwibWVzc2FnZVB1YmxpY2F0aW9uSUQiOiI0ZWQ3ODkwZi0zMTZhLTQyNjctYTYyZi1mOGE4Njg5NGY1OTAiLCJtZXNzYWdlVHlwZSI6Im1hcmtldGluZyIsImNhbXBhaWduSUQiOiI2ZTY1NjJkNy02NGQxLTQ5YTQtODlmMC01ZmVjYmQ5Y2M3ODkiLCJjYW1wYWlnblZlcnNpb25JRCI6Ijc3Zjg4ODExLTZmZDMtNDg1NC05NWRhLTYzNjgzOTZlYzYzOCIsImNhbXBhaWduQWN0aW9uSUQiOiIzZTAzMjZjOS1kODFkLTRmNGMtYjdkYS02OThmNGY4MzQ4ODkifSwibWVzc2FnZVByb2ZpbGUiOnsibWVzc2FnZVByb2ZpbGVJRCI6ImQ2ZTU3NzY2LTI1OTYtNDhmNy1iYWUwLWIxZjQxZGJhMzMxMCIsImNoYW5uZWwiOnsiX2lkIjoiaHR0cHM6Ly9ucy5hZG9iZS5jb20veGRtL2NoYW5uZWxzL2NvZGUiLCJfdHlwZSI6Imh0dHBzOi8vbnMuYWRvYmUuY29tL3hkbS9jaGFubmVsLXR5cGVzL2NvZGUifX19"
                        },
                        "activity": {
                            "id": "6e6562d7-64d1-49a4-89f0-5fecbd9cc789#3e0326c9-d81d-4f4c-b7da-698f4f834889"
                        }
                    },
                    "items": [
                        {
                            "id": "8c6946c5-79ba-493d-93c1-5d4886a49831",
                            "schema": "https://ns.adobe.com/personalization/json-content-item",
                            "data": {
                                "content": {
                                    "heroImageName": "demo-marketing-decision1-treatment-B.png",
                                    "buttonActions": [
                                        {
                                            "id": 1,
                                            "text": "Buy now and Save 20%",
                                            "content": "Thank you for your purchase!"
                                        },
                                        {
                                            "id": 2,
                                            "text": "Subscribe to the Pod",
                                            "content": "Thank you for subscribing!"
                                        },
                                        {
                                            "id": 3,
                                            "text": "Get FREE stuff",
                                            "content": "Use coupon code THANKYOU at checkout."
                                        }
                                    ]
                                }
                            }
                        }
                    ]
                }
            ],
            "type": "personalization:decisions",
            "eventIndex": 0
        },
        {
            "payload": [
                {
                    "scope": "Target",
                    "hint": "35",
                    "ttlSeconds": 1800
                },
                {
                    "scope": "AAM",
                    "hint": "9",
                    "ttlSeconds": 1800
                },
                {
                    "scope": "EdgeNetwork",
                    "hint": "or2",
                    "ttlSeconds": 1800
                }
            ],
            "type": "locationHint:result"
        },
        {
            "payload": [
                {
                    "key": "kndctr_906E3A095DC834230A495FD6_AdobeOrg_identity",
                    "value": "CiYwNzg4MjM1NzY5Nzg5NDk5Mjc1MTMwNzUxMzk5NDg4MDQ2NDcwOFIQCJO_79CpMRgBKgNPUjIwA_ABiqHB8qwx",
                    "maxAge": 34128000
                },
                {
                    "key": "kndctr_906E3A095DC834230A495FD6_AdobeOrg_cluster",
                    "value": "or2",
                    "maxAge": 1800
                }
            ],
            "type": "state:store"
        }
    ]
}
```

### Proposition Display

```http request
curl --location 'https://edge.adobedc.net/ee/v1/interact?configId=0814ac07-ffeb-44c4-8633-85301d5e721c' \
--header 'Content-Type: application/json' \
--data '{
  "meta": {
    "configOverrides": {},
    "state": {
      "domain": "127.0.0.1",
      "cookiesEnabled": true,
      "entries": [
        {
          "key": "kndctr_906E3A095DC834230A495FD6_AdobeOrg_identity",
          "value": "CiYzMjQ1OTU5ODYxMjczMjAwOTQyMDkyNzg4ODAxMjkyNjQzMDE2N1IOCKnC9bOmMRgBKgNPUjLwAYag7vCsMQ=="
        },
        {
          "key": "kndctr_906E3A095DC834230A495FD6_AdobeOrg_cluster",
          "value": "or2"
        }
      ]
    }
  },
  "events": [
    {
      "xdm": {
        "web": {
          "webPageDetails": {
            "URL": "https://127.0.0.1/"
          },
          "webReferrer": {
            "URL": ""
          }
        },
        "device": {
          "screenHeight": 1080,
          "screenWidth": 1920,
          "screenOrientation": "landscape"
        },
        "environment": {
          "type": "browser",
          "browserDetails": {
            "viewportWidth": 1865,
            "viewportHeight": 548
          }
        },
        "placeContext": {
          "localTimezoneOffset": 420,
          "localTime": "2023-09-25T14:00:42.164-07:00"
        },
        "timestamp": "2023-09-25T21:00:42.164Z",
        "implementationDetails": {
          "name": "https://ns.adobe.com/experience/alloy",
          "version": "2.18.0",
          "environment": "browser"
        },
        "eventType": "decisioning.propositionDisplay",
        "_experience": {
          "decisioning": {
            "propositions": [
              {
                "id": "30516e25-d493-4122-bbcd-557907f3f5f1",
                "scope": "web://localhost/#sample-json-content",
                "scopeDetails": {
                  "decisionProvider": "AJO",
                  "correlationID": "eb89d782-d760-4201-bd3f-f54c178f4502",
                  "strategies": [
                    {
                      "strategyID": "6lxiLqnWGfdnXhiPbXpzrT",
                      "treatmentID": "d8c5c04d51"
                    }
                  ],
                  "characteristics": {
                    "eventToken": "eyJtZXNzYWdlRXhlY3V0aW9uIjp7Im1lc3NhZ2VFeGVjdXRpb25JRCI6Ik5BIiwibWVzc2FnZUlEIjoiZWI4OWQ3ODItZDc2MC00MjAxLWJkM2YtZjU0YzE3OGY0NTAyIiwibWVzc2FnZVB1YmxpY2F0aW9uSUQiOiI3MTE4ODBiOC0zOTczLTQwNzgtYmU3ZS04ODgxYWZkYjNkZWUiLCJtZXNzYWdlVHlwZSI6Im1hcmtldGluZyIsImNhbXBhaWduSUQiOiI2ZTY1NjJkNy02NGQxLTQ5YTQtODlmMC01ZmVjYmQ5Y2M3ODkiLCJjYW1wYWlnblZlcnNpb25JRCI6Ijc3Zjg4ODExLTZmZDMtNDg1NC05NWRhLTYzNjgzOTZlYzYzOCIsImNhbXBhaWduQWN0aW9uSUQiOiIzZTAzMjZjOS1kODFkLTRmNGMtYjdkYS02OThmNGY4MzQ4ODkifSwibWVzc2FnZVByb2ZpbGUiOnsibWVzc2FnZVByb2ZpbGVJRCI6ImMyOTRmZmZkLTU5YmYtNGJkYy05N2RjLTU3MGIyNzQ4OThlYyIsImNoYW5uZWwiOnsiX2lkIjoiaHR0cHM6Ly9ucy5hZG9iZS5jb20veGRtL2NoYW5uZWxzL2NvZGUiLCJfdHlwZSI6Imh0dHBzOi8vbnMuYWRvYmUuY29tL3hkbS9jaGFubmVsLXR5cGVzL2NvZGUifX19"
                  },
                  "activity": {
                    "id": "6e6562d7-64d1-49a4-89f0-5fecbd9cc789#3e0326c9-d81d-4f4c-b7da-698f4f834889"
                  }
                }
              }
            ],
            "propositionEventType": {
              "display": 1
            }
          }
        }
      }
    }
  ],
  "query": {
    "identity": {
      "fetch": [
        "ECID"
      ]
    }
  }
}'
```

### Proposition Click

```http request
curl --location 'https://edge.adobedc.net/ee/v1/interact?configId=0814ac07-ffeb-44c4-8633-85301d5e721c' \
--header 'Content-Type: application/json' \
--data '{
  "meta": {
    "configOverrides": {},
    "state": {
      "domain": "127.0.0.1",
      "cookiesEnabled": true,
      "entries": [
        {
          "key": "kndctr_906E3A095DC834230A495FD6_AdobeOrg_identity",
          "value": "CiYzMjQ1OTU5ODYxMjczMjAwOTQyMDkyNzg4ODAxMjkyNjQzMDE2N1IOCKnC9bOmMRgBKgNPUjLwAYag7vCsMQ=="
        },
        {
          "key": "kndctr_906E3A095DC834230A495FD6_AdobeOrg_cluster",
          "value": "or2"
        }
      ]
    }
  },
  "events": [
    {
      "xdm": {
        "web": {
          "webPageDetails": {
            "URL": "https://127.0.0.1/"
          },
          "webReferrer": {
            "URL": ""
          }
        },
        "device": {
          "screenHeight": 1080,
          "screenWidth": 1920,
          "screenOrientation": "landscape"
        },
        "environment": {
          "type": "browser",
          "browserDetails": {
            "viewportWidth": 1865,
            "viewportHeight": 548
          }
        },
        "placeContext": {
          "localTimezoneOffset": 420,
          "localTime": "2023-09-25T14:00:53.381-07:00"
        },
        "timestamp": "2023-09-25T21:00:53.381Z",
        "implementationDetails": {
          "name": "https://ns.adobe.com/experience/alloy",
          "version": "2.18.0",
          "environment": "browser"
        },
        "eventType": "decisioning.propositionInteract",
        "_experience": {
          "decisioning": {
            "propositions": [
              {
                "id": "30516e25-d493-4122-bbcd-557907f3f5f1",
                "scope": "web://localhost/#sample-json-content",
                "scopeDetails": {
                  "decisionProvider": "AJO",
                  "correlationID": "eb89d782-d760-4201-bd3f-f54c178f4502",
                  "strategies": [
                    {
                      "strategyID": "6lxiLqnWGfdnXhiPbXpzrT",
                      "treatmentID": "d8c5c04d51"
                    }
                  ],
                  "characteristics": {
                    "eventToken": "eyJtZXNzYWdlRXhlY3V0aW9uIjp7Im1lc3NhZ2VFeGVjdXRpb25JRCI6Ik5BIiwibWVzc2FnZUlEIjoiZWI4OWQ3ODItZDc2MC00MjAxLWJkM2YtZjU0YzE3OGY0NTAyIiwibWVzc2FnZVB1YmxpY2F0aW9uSUQiOiI3MTE4ODBiOC0zOTczLTQwNzgtYmU3ZS04ODgxYWZkYjNkZWUiLCJtZXNzYWdlVHlwZSI6Im1hcmtldGluZyIsImNhbXBhaWduSUQiOiI2ZTY1NjJkNy02NGQxLTQ5YTQtODlmMC01ZmVjYmQ5Y2M3ODkiLCJjYW1wYWlnblZlcnNpb25JRCI6Ijc3Zjg4ODExLTZmZDMtNDg1NC05NWRhLTYzNjgzOTZlYzYzOCIsImNhbXBhaWduQWN0aW9uSUQiOiIzZTAzMjZjOS1kODFkLTRmNGMtYjdkYS02OThmNGY4MzQ4ODkifSwibWVzc2FnZVByb2ZpbGUiOnsibWVzc2FnZVByb2ZpbGVJRCI6ImMyOTRmZmZkLTU5YmYtNGJkYy05N2RjLTU3MGIyNzQ4OThlYyIsImNoYW5uZWwiOnsiX2lkIjoiaHR0cHM6Ly9ucy5hZG9iZS5jb20veGRtL2NoYW5uZWxzL2NvZGUiLCJfdHlwZSI6Imh0dHBzOi8vbnMuYWRvYmUuY29tL3hkbS9jaGFubmVsLXR5cGVzL2NvZGUifX19"
                  },
                  "activity": {
                    "id": "6e6562d7-64d1-49a4-89f0-5fecbd9cc789#3e0326c9-d81d-4f4c-b7da-698f4f834889"
                  }
                }
              }
            ],
            "propositionEventType": {
              "interact": 1
            },
            "propositionAction": {
              "label": "Buy Now"
            }
          }
        }
      }
    }
  ],
  "query": {
    "identity": {
      "fetch": [
        "ECID"
      ]
    }
  }
}'
```

