// Development client using InMemoryClient for local testing
import type { IClient } from './types';
import { InMemoryClient, InMemoryTokenStorage, ICoreHandlers } from './InMemoryClient';

let devClientInstance: IClient | null = null;
let devClientPromise: Promise<IClient> | null = null;

export async function createDevClient(): Promise<IClient> {
  if (devClientInstance) {
    return devClientInstance;
  }

  if (devClientPromise) {
    return devClientPromise;
  }

  devClientPromise = (async () => {
    try {
      // Dynamically import to allow code splitting
      const [handlersModule, sqliteModule] = await Promise.all([
        import('../../api/src/core/handlers'),
        import('../../api/src/core/SqliteAdapter'),
      ]);

      // Create in-memory database
      const db = await sqliteModule.createInMemoryDatabase();

      // Create database adapter and handlers
      const adapter = new sqliteModule.SqliteAdapter(db);
      const handlers = new handlersModule.CoreHandlers(
        adapter,
        handlersModule.webCryptoProvider
      ) as unknown as ICoreHandlers;

      // Create token storage and client
      const tokenStorage = new InMemoryTokenStorage();
      const client = new InMemoryClient(handlers, tokenStorage);

      // Seed a dev user and auto-login
      const registerResult = await client.auth.register(
        'dev@example.com',
        'Dev User',
        'DevPassword123'
      );

      if (registerResult.error) {
        console.error('Failed to seed dev user:', registerResult.error);
      }

      // Seed sample public recipes with images
      const sampleRecipes = [
        {
          title: 'Creamy Tuscan Chicken',
          description: 'Pan-seared chicken breasts in a rich sun-dried tomato and spinach cream sauce.',
          ingredients: ['4 chicken breasts', '1 cup sun-dried tomatoes', '2 cups fresh spinach', '1 cup heavy cream', '3 cloves garlic', '1/2 cup parmesan cheese'],
          instructions: ['Season chicken breasts with salt and pepper', 'Sear chicken in olive oil until golden brown on both sides', 'Remove chicken and sauté garlic', 'Add cream, sun-dried tomatoes, and spinach', 'Return chicken to pan and simmer until cooked through', 'Top with parmesan and serve'],
          tags: ['dinner', 'chicken', 'italian', 'creamy'],
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
        },
        {
          title: 'Classic Beef Tacos',
          description: 'Perfectly seasoned ground beef tacos with fresh toppings and all the fixings.',
          ingredients: ['1 lb ground beef', '2 tbsp taco seasoning', '8 corn taco shells', '1 cup shredded lettuce', '1 cup diced tomatoes', '1 cup shredded cheese', 'Sour cream'],
          instructions: ['Brown ground beef in a skillet over medium-high heat', 'Drain excess fat and add taco seasoning with 1/4 cup water', 'Simmer until sauce thickens', 'Warm taco shells according to package directions', 'Fill shells with beef and top with your favorite toppings'],
          tags: ['dinner', 'mexican', 'quick', 'beef'],
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
        },
        {
          title: 'Vegetarian Buddha Bowl',
          description: 'Nourishing bowl with roasted vegetables, fluffy quinoa, and creamy tahini dressing.',
          ingredients: ['1 cup quinoa', '1 sweet potato, cubed', '1 can chickpeas, drained', '2 cups kale', '1 avocado', '1/4 cup tahini', '2 tbsp lemon juice'],
          instructions: ['Cook quinoa according to package directions', 'Roast sweet potato and chickpeas at 400°F for 25 minutes', 'Massage kale with olive oil and salt', 'Make tahini dressing by whisking tahini, lemon juice, and water', 'Assemble bowls with quinoa, roasted veggies, kale, and avocado', 'Drizzle with tahini dressing'],
          tags: ['vegetarian', 'healthy', 'lunch', 'vegan'],
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
        },
        {
          title: 'Homemade Margherita Pizza',
          description: 'Classic Italian pizza with fresh mozzarella, basil, and San Marzano tomato sauce.',
          ingredients: ['1 lb pizza dough', '1 cup San Marzano tomatoes', '8 oz fresh mozzarella', 'Fresh basil leaves', '2 tbsp olive oil', 'Salt to taste'],
          instructions: ['Preheat oven to 500°F with pizza stone if available', 'Stretch dough into a 12-inch circle', 'Crush tomatoes and spread on dough', 'Tear mozzarella into pieces and distribute evenly', 'Bake for 10-12 minutes until crust is golden', 'Top with fresh basil and drizzle with olive oil'],
          tags: ['dinner', 'italian', 'vegetarian', 'pizza'],
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
        },
        {
          title: 'Garlic Butter Shrimp Pasta',
          description: 'Succulent shrimp tossed in a luscious garlic butter sauce over al dente linguine.',
          ingredients: ['1 lb large shrimp, peeled', '12 oz linguine', '4 tbsp butter', '6 cloves garlic', '1/2 cup white wine', '1/4 cup fresh parsley', 'Red pepper flakes'],
          instructions: ['Cook linguine according to package directions, reserve 1 cup pasta water', 'Sauté shrimp in butter until pink, about 2-3 minutes per side', 'Remove shrimp and sauté garlic until fragrant', 'Add white wine and reduce by half', 'Toss pasta with shrimp, sauce, and parsley', 'Add pasta water if needed for consistency'],
          tags: ['dinner', 'seafood', 'pasta', 'quick'],
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800',
        },
        {
          title: 'Fluffy Blueberry Pancakes',
          description: 'Light and fluffy pancakes bursting with fresh blueberries, perfect for weekend brunch.',
          ingredients: ['2 cups all-purpose flour', '2 tbsp sugar', '2 tsp baking powder', '1 cup milk', '2 eggs', '1/4 cup melted butter', '1 cup fresh blueberries'],
          instructions: ['Whisk together flour, sugar, and baking powder', 'In another bowl, mix milk, eggs, and melted butter', 'Combine wet and dry ingredients until just mixed', 'Fold in blueberries gently', 'Cook on a griddle over medium heat until bubbles form', 'Flip and cook until golden brown'],
          tags: ['breakfast', 'brunch', 'sweet', 'vegetarian'],
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800',
        },
        {
          title: 'Thai Green Curry',
          description: 'Aromatic Thai curry with tender vegetables in creamy coconut milk.',
          ingredients: ['2 tbsp green curry paste', '1 can coconut milk', '1 lb chicken thighs', '1 cup bamboo shoots', '1 bell pepper', 'Thai basil leaves', 'Fish sauce to taste'],
          instructions: ['Sauté curry paste in a wok until fragrant', 'Add coconut milk and bring to a simmer', 'Add chicken pieces and cook for 10 minutes', 'Add bamboo shoots and bell pepper', 'Season with fish sauce and palm sugar', 'Garnish with Thai basil and serve over jasmine rice'],
          tags: ['dinner', 'asian', 'spicy', 'chicken'],
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
        },
        {
          title: 'Mediterranean Quinoa Salad',
          description: 'Fresh and vibrant salad with cucumber, tomatoes, olives, and feta in lemon dressing.',
          ingredients: ['1 cup quinoa, cooked', '1 cucumber, diced', '1 cup cherry tomatoes', '1/2 cup kalamata olives', '4 oz feta cheese', '1/4 cup olive oil', '3 tbsp lemon juice'],
          instructions: ['Let quinoa cool to room temperature', 'Dice cucumber and halve cherry tomatoes', 'Combine quinoa, vegetables, and olives in a large bowl', 'Crumble feta cheese on top', 'Whisk olive oil, lemon juice, and oregano for dressing', 'Toss salad with dressing and season to taste'],
          tags: ['lunch', 'healthy', 'vegetarian', 'mediterranean'],
          isPublic: true,
          imageUrl: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800',
        },
      ];

      for (const recipe of sampleRecipes) {
        await client.recipes.create(recipe);
      }

      // Seed public cookbooks
      await client.cookbooks.create({
        name: 'Quick Weeknight Dinners',
        description: 'Easy recipes for busy evenings when you want something delicious but simple',
        isPublic: true,
      });

      await client.cookbooks.create({
        name: 'Healthy Meal Prep',
        description: 'Nutritious recipes perfect for meal prepping on Sundays',
        isPublic: true,
      });

      await client.cookbooks.create({
        name: 'Comfort Food Classics',
        description: 'Timeless recipes that warm the soul',
        isPublic: true,
      });

      devClientInstance = client;
      return client;
    } catch (error) {
      console.error('Failed to create dev client:', error);
      throw error;
    }
  })();

  return devClientPromise;
}

export function getDevClient(): IClient | null {
  return devClientInstance;
}
