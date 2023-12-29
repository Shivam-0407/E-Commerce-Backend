"use strict";

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async customeOrderController(ctx) {
    const entries = await strapi.entityService.findMany(
      "api::product.product",
      {
        fields: ["title"],
      }
    );
    return { data: entries };
  },
  async create(ctx) {
    
    const { products } = ctx.request.body;
    
    const lineItems = await Promise.all(products.map(async(product) => {

        const productEntities = await strapi.entityService.findMany("api::product.product",{
            filters:{
                key:product.key
            }
        })

        return{
            price_data:{
                currency:'inr',
                product_data:{
                    name: product.title,
                    images:[product.image]
                },
                unit_amount: product.price*100
            },
            quantity:product.quantity
        }
    })
    )

    const session = await stripe.checkout.sessions.create({
      shipping_address_collection:{
        allowed_countries:['IN']
      },
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_BASE_URL}/payments/success`,
      cancel_url: `${process.env.CLIENT_BASE_URL}/payments/failed`,
    });

    //overriding the create entity service api method
    await strapi.entityService.create("api::order.order", {
      data: {
        products,
        stripeId: session.id,
      },
    });

    return { stripeId: session.id, };
  },
}));
