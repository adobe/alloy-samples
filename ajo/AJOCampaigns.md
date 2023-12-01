# Summary of personalization content

There are two AJO Campaigns that impact the page.

## Campaign 1

[//]: # "https://experience.adobe.com/#/@aemonacpprodcampaign/sname:prod/journey-optimizer/campaigns/summary/1de9a651-54e7-4666-8556-bfc5ba9b5d9f"

Campaign 1 is a web campaign with an experiment created using the Visual Experience Composer (VEC). The experiment has two treatments with each one changing the header text and adding an alert beneath it.

| Treatment                    | Visual treatment                                                       |
| ---------------------------- | ---------------------------------------------------------------------- |
| Treatment A                  | <img src="../.assets/activity-1-exp-A.png" alt="drawing" width="800"/> |
| Treatment B                  | <img src="../.assets/activity-1-exp-B.png" alt="drawing" width="800"/> |
| Default (no personalization) | <img src="../.assets/activity-1-exp-0.png" alt="drawing" width="800"/> |

## Campaign 2

[//]: # "https://experience.adobe.com/#/@aemonacpprodcampaign/sname:prod/journey-optimizer/campaigns/summary/76992139-bc1e-4092-96ed-ce771b0296e9"

Campaign 2 is a code based experience campaign with an experiment created using the code editor. The experiment has two treatments with each one consisting of JSON values to update the hero image and button text/actions on the page.

<table>
  <thead>
    <tr>
      <th>Treatment</th>
      <th>JSON Content / Visual treatment</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Treatment A</td>
      <td>

```json
{
  "heroImageName": "demo-marketing-decision1-treatment-A.png",
  "buttonActions": [
    { "id": 1, "text": "Buy Now", "content": "Thanks for your purchase!" },
    { "id": 2, "text": "Subscribe", "content": "You are now subscribed!" },
    { "id": 3, "text": "Download", "content": "Downloading..." }
  ]
}
```

<img src="../.assets/activity-2-exp-A.png" alt="drawing" width="800"/>
</td>
    </tr>    
    <tr>
      <td>Treatment B</td>
      <td>

```json
{
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
```

<img src="../.assets/activity-2-exp-B.png" alt="drawing" width="800"/>
</td>
    </tr>    
    <tr>
      <td>Default (no personalization)</td>
      <td>
        <img src="../.assets/activity-2-exp-0.png" alt="drawing" width="800"/>
      </td>
    </tr>
  </tbody>
</table>
