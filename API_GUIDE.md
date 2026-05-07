# Food Menu API - Developer Guide

## Overview

The Food Menu API is a middleware service that converts food menu data from various sources (HTML pages, PDFs, and other formats) into standardized JSON responses. This API provides access to food menus from schools, restaurants, and food service providers across Finland.

### Key Features
- **25+ menu sources** including schools, restaurants, and food service systems
- **Standardized JSON responses** for all endpoints
- **Real-time data** fetched directly from source websites
- **Swagger documentation** for interactive API testing
- **Error handling** with consistent response formats

## Quick Start

### Prerequisites
- Node.js 14+
- npm or yarn

### Installation
```bash
git clone https://github.com/wilmaplus/foodmenu.git
cd foodmenu
npm install
```

### Running the Server
```bash
# Development mode
npm start

# Production build
npm run production
```

The server will start on `http://localhost:3000` by default.

### Accessing Documentation
- **Swagger UI**: Visit `http://localhost:3000/docs` for interactive API documentation
- **API Testing**: Use the built-in Swagger interface to test endpoints

## API Endpoints

### Schools

#### Asikkala Schools
```http
GET /asikkala/menu
```

#### SYK School
```http
GET /syk/menu
```

#### TYK School
```http
GET /tyk/menu
```

#### MAYK School
```http
GET /mayk/menu
```

#### Steiner School
```http
GET /steiner/menu
```

#### Pyhtää Schools
```http
GET /pyhtaa/menu
```

#### PHYK Educational Services
```http
GET /phyk/menu
```

#### Pöytyä Schools
```http
GET /poytyaps/menu
```

#### Kauhajoki Schools
```http
GET /kauhajoki/menu
```

#### Mantsala Schools
```http
GET /mantsala/menu
```

### Restaurants

#### Kastelli Restaurant
```http
GET /kastelli/menu
```

#### AEL Restaurant
```http
GET /ael/menu
```

#### Tampere-Pirkkala Airport Restaurant
```http
GET /krtpl/menu
```

#### Looki Restaurant System
```http
GET /looki/{endpoint}/menu
```
Replace `{endpoint}` with the specific restaurant identifier.

### Daycare

#### Loviisa Daycare
```http
GET /loviisa/paivakoti/menu
```

### Food Service Systems

#### ISS - Get Restaurant List
```http
GET /iss/menus
```

#### ISS - Get Specific Restaurant Menu
```http
GET /iss/menu/{url}
```
Replace `{url}` with the restaurant URL (can use `iss://` prefix).

#### Jamix - Get Restaurants
```http
GET /jamix/restaurants
```

#### Jamix - Search Restaurants
```http
GET /jamix/{query}/restaurants
```
Replace `{query}` with search term.

#### Jamix - Get Restaurant Menu
```http
GET /jamix/menu/{customerId}/{kitchenId}
```
Replace `{customerId}` and `{kitchenId}` with specific identifiers.

**Optional Query Parameters:**
- `date`: Start date in YYYYMMDD format (e.g., `20241225`)
- `date2`: End date in YYYYMMDD format (e.g., `20241231`)
- `lang`: Language (`fi` for Finnish, `en` for English, default: `fi`)

**Examples:**
```http
# Get current menu
GET /jamix/menu/123/456

# Get menu for specific date
GET /jamix/menu/123/456?date=20241225

# Get menu for date range (week)
GET /jamix/menu/123/456?date=20241223&date2=20241229

# Get menu in English
GET /jamix/menu/123/456?lang=en
```

#### Aromi - Get Restaurants
```http
GET /aroma/{url}/restaurants
```
Replace `{url}` with the Aromi service URL (can use `aromiv2://` prefix).

#### Aromi - Get Restaurant Menu
```http
GET /aroma/{url}/restaurants/{id}
```
Replace `{url}` with service URL and `{id}` with restaurant ID.

### Menu Directory

#### Get All Menu Providers
```http
GET /menus
```

Returns a comprehensive list of all available menu providers with metadata including names, descriptions, logos, and endpoint information.

**Response includes:**
- Provider name and description
- Category (School, Restaurant, Daycare, Food Service)
- Logo/image URLs
- API endpoint patterns
- Supported features
- Geographic location
- Official websites

## Response Format

All endpoints return JSON responses with a consistent structure:

### Success Response
```json
{
  "status": true,
  "data": {
    "menu": [
      {
        "date": "2024-01-15T00:00:00.000Z",
        "courses": [
          {
            "name": "Lounas",
            "meals": [
              {
                "name": "Grilled salmon with vegetables",
                "id": "abc123def456"
              },
              {
                "name": "Vegetable stew",
                "id": "def456ghi789"
              }
            ]
          }
        ]
      }
    ],
    "diets": []
  }
}
```

### Error Response
```json
{
  "status": false,
  "cause": "Unable to parse menu!"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | boolean | `true` for success, `false` for error |
| `data.menu` | array | Array of menu days |
| `data.menu[].date` | string | ISO date string for the menu day |
| `data.menu[].courses` | array | Array of meal courses (usually "Lounas") |
| `data.menu[].courses[].name` | string | Course name (e.g., "Lounas") |
| `data.menu[].courses[].meals` | array | Array of meals for the course |
| `data.menu[].courses[].meals[].name` | string | Meal name/description |
| `data.menu[].courses[].meals[].id` | string | Unique identifier for the meal |
| `data.diets` | array | Diet information (may be empty) |
| `cause` | string | Error message (only present on errors) |

## Usage Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Get current school menu
async function getSchoolMenu() {
  try {
    const response = await axios.get('http://localhost:3000/asikkala/menu');
    if (response.data.status) {
      console.log('Menu retrieved:', response.data.data);
    } else {
      console.error('Error:', response.data.cause);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Get Jamix menu for today
async function getTodaysJamixMenu(customerId, kitchenId) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  try {
    const response = await axios.get(`http://localhost:3000/jamix/menu/${customerId}/${kitchenId}?date=${today}`);
    if (response.data.status) {
      console.log('Today\'s menu:', response.data.data);
    } else {
      console.error('Error:', response.data.cause);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Get Jamix menu for current week
async function getCurrentWeekJamixMenu(customerId, kitchenId) {
  const today = new Date();
  const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const startDate = monday.toISOString().slice(0, 10).replace(/-/g, '');
  const endDate = friday.toISOString().slice(0, 10).replace(/-/g, '');

  try {
    const response = await axios.get(`http://localhost:3000/jamix/menu/${customerId}/${kitchenId}?date=${startDate}&date2=${endDate}`);
    if (response.data.status) {
      console.log('Current week menu:', response.data.data);
    } else {
      console.error('Error:', response.data.cause);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Get list of all available menu providers
async function getMenuProviders() {
  try {
    const response = await axios.get('http://localhost:3000/menus');
    if (response.data.status) {
      console.log('Available menu providers:');
      response.data.data.providers.forEach(provider => {
        console.log(`- ${provider.name} (${provider.type}): ${provider.endpoint}`);
        if (provider.logo) {
          console.log(`  Logo: ${provider.logo}`);
        }
      });
    } else {
      console.error('Error:', response.data.cause);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Usage examples
getSchoolMenu();
getTodaysJamixMenu('123', '456');
getCurrentWeekJamixMenu('123', '456');
getMenuProviders();
```

### Python
```python
import requests
from datetime import datetime, timedelta

def get_menu():
    try:
        response = requests.get('http://localhost:3000/asikkala/menu')
        data = response.json()

        if data['status']:
            menu = data['data']['menu']
            print("Menu retrieved successfully")
            for day in menu:
                print(f"Date: {day['date']}")
                for course in day.get('courses', []):
                    print(f"Course: {course['name']}")
                    for meal in course.get('meals', []):
                        print(f"  - {meal['name']}")
        else:
            print(f"Error: {data['cause']}")

    except requests.RequestException as e:
        print(f"Request failed: {e}")

def get_jamix_menu_today(customer_id, kitchen_id):
    """Get today's Jamix menu"""
    today = datetime.now().strftime('%Y%m%d')
    try:
        response = requests.get(f'http://localhost:3000/jamix/menu/{customer_id}/{kitchen_id}?date={today}')
        data = response.json()

        if data['status']:
            print(f"Today's menu for kitchen {kitchen_id}:")
            # Process menu data...
            print("Menu retrieved successfully")
        else:
            print(f"Error: {data['cause']}")

    except requests.RequestException as e:
        print(f"Request failed: {e}")

def get_jamix_menu_week(customer_id, kitchen_id):
    """Get current week's Jamix menu"""
    today = datetime.now()
    # Get Monday of current week
    monday = today - timedelta(days=today.weekday())
    # Get Friday of current week
    friday = monday + timedelta(days=4)

    start_date = monday.strftime('%Y%m%d')
    end_date = friday.strftime('%Y%m%d')

    try:
        response = requests.get(f'http://localhost:3000/jamix/menu/{customer_id}/{kitchen_id}?date={start_date}&date2={end_date}')
        data = response.json()

        if data['status']:
            print(f"Current week menu for kitchen {kitchen_id}:")
            print("Menu retrieved successfully")
        else:
            print(f"Error: {data['cause']}")

    except requests.RequestException as e:
        print(f"Request failed: {e}")

def get_menu_providers():
    """Get list of all available menu providers"""
    try:
        response = requests.get('http://localhost:3000/menus')
        data = response.json()

        if data['status']:
            print("Available menu providers:")
            for provider in data['data']['providers']:
                print(f"- {provider['name']} ({provider['type']}): {provider['endpoint']}")
                if provider.get('logo'):
                    print(f"  Logo: {provider['logo']}")
                if provider.get('location'):
                    print(f"  Location: {provider['location']}")
        else:
            print(f"Error: {data['cause']}")

    except requests.RequestException as e:
        print(f"Request failed: {e}")

# Usage examples
get_menu()
get_jamix_menu_today('123', '456')
get_jamix_menu_week('123', '456')
get_menu_providers()
```

### cURL
```bash
# Get school menu
curl -X GET "http://localhost:3000/asikkala/menu"

# Get restaurant list from ISS
curl -X GET "http://localhost:3000/iss/menus"

# Get specific restaurant menu
curl -X GET "http://localhost:3000/iss/menu/example-restaurant.com"

# Search Jamix restaurants
curl -X GET "http://localhost:3000/jamix/pizza/restaurants"

# Get Jamix menu for specific date
curl -X GET "http://localhost:3000/jamix/menu/123/456?date=20241225"

# Get Jamix menu for date range (week)
curl -X GET "http://localhost:3000/jamix/menu/123/456?date=20241223&date2=20241229"

# Get Jamix menu in English
curl -X GET "http://localhost:3000/jamix/menu/123/456?lang=en"

# Get complete list of all menu providers
curl -X GET "http://localhost:3000/menus"
```

### PHP
```php
<?php

function getMenu($endpoint) {
    $url = "http://localhost:3000/" . $endpoint;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        echo 'Error: ' . curl_error($ch);
        return;
    }

    curl_close($ch);

    $data = json_decode($response, true);

    if ($data['status']) {
        echo "Menu retrieved successfully\n";
        foreach ($data['data']['menu'] as $day) {
            echo "Date: " . $day['date'] . "\n";
            foreach ($day['courses'] ?? [] as $course) {
                echo "Course: " . $course['name'] . "\n";
                foreach ($course['meals'] ?? [] as $meal) {
                    echo "  - " . $meal['name'] . "\n";
                }
            }
        }
    } else {
        echo "Error: " . $data['cause'] . "\n";
    }
}

// Usage
getMenu('asikkala/menu');

?>
```

## Error Handling

The API uses consistent error handling across all endpoints:

### Common Error Types
- **500 Internal Server Error**: Server-side issues, parsing failures
- **400 Bad Request**: Invalid parameters or malformed requests
- **404 Not Found**: Invalid endpoints

### Error Response Format
```json
{
  "status": false,
  "cause": "Error description"
}
```

### Handling Errors in Code
```javascript
const response = await fetch('http://localhost:3000/api/endpoint');

if (!response.ok) {
  console.error(`HTTP Error: ${response.status}`);
  return;
}

const data = await response.json();

if (!data.status) {
  console.error(`API Error: ${data.cause}`);
  return;
}

// Process successful response
console.log(data.data);
```

## Rate Limiting

Currently, there are no explicit rate limits implemented. However, be respectful of the source websites by:
- Caching responses when possible
- Avoiding excessive requests
- Implementing exponential backoff for retries

## Advanced Features

### Date-Based Menu Queries

The Jamix endpoints support advanced date filtering to retrieve menus for specific time periods:

#### Date Parameters
- **`date`**: Start date in `YYYYMMDD` format (e.g., `20241225`)
- **`date2`**: End date in `YYYYMMDD` format (e.g., `20241231`)
- **`lang`**: Language preference (`fi` = Finnish, `en` = English)

#### Common Use Cases
```javascript
// Today's menu
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
GET /jamix/menu/123/456?date=${today}

// This week's menu (Monday to Friday)
const monday = getMondayOfWeek();
const friday = new Date(monday);
friday.setDate(monday.getDate() + 4);
GET /jamix/menu/123/456?date=${monday}&date2=${friday}

// Next week's menu
const nextMonday = getMondayOfWeek();
nextMonday.setDate(nextMonday.getDate() + 7);
const nextFriday = new Date(nextMonday);
nextFriday.setDate(nextMonday.getDate() + 4);
GET /jamix/menu/123/456?date=${nextMonday}&date2=${nextFriday}
```

#### Benefits
- **Reduced data transfer**: Get only the menu data you need
- **Better performance**: Smaller responses for specific date ranges
- **Historical data**: Access past menus
- **Planning**: Get upcoming menus for meal planning
- **Caching efficiency**: Different cache keys for different date ranges

## Data Sources

The API aggregates data from various sources:

### Schools & Educational Institutions
- Municipality school systems
- Private schools
- Educational service providers

### Restaurants & Cafeterias
- Commercial restaurants
- Airport restaurants
- Food service contractors

### Food Service Systems
- **ISS**: Large Finnish food service provider
- **Jamix**: Restaurant management system with advanced date filtering
- **Aromi**: Food service platform
- **Looki**: Restaurant platform

## Caching

Some endpoints implement caching to reduce load on source websites:
- Menu data is cached for performance
- Cache duration varies by endpoint
- Fresh data is fetched when cache expires

## Troubleshooting

### Common Issues

#### "Unable to parse menu!" Error
- The source website structure may have changed
- Temporary network issues with the source
- The menu data format is currently unsupported

#### Empty Menu Response
- No menu data available for the current period
- Source website is down or unreachable
- Parsing logic needs updating

#### Slow Response Times
- Source website is slow to respond
- Large amounts of data being processed
- Network connectivity issues

### Debugging Steps
1. Check if the source website is accessible directly
2. Verify the endpoint URL is correct
3. Test with different endpoints to isolate issues
4. Check server logs for detailed error information

### Getting Help
- Check the [GitHub Issues](https://github.com/wilmaplus/foodmenu/issues) for known problems
- Review the [Wiki](https://github.com/wilmaplus/foodmenu/wiki) for additional documentation
- Test endpoints using the Swagger UI at `/docs`

## Contributing

To add support for new menu sources:
1. Create a new handler in `src/handlers/`
2. Implement parsing logic in `src/parsers/`
3. Add the route to `src/main.ts`
4. Add Swagger documentation
5. Update this guide

## License

This project is licensed under GPL-2.0. See LICENSE file for details.
