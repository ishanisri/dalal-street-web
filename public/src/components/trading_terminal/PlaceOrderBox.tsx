import * as React from "react";
import {PlaceOrderRequest, PlaceOrderResponse} from "../../../proto_build/actions/PlaceOrder_pb";
import { OrderType } from "../../../proto_build/models/OrderType_pb";
import { DalalActionService } from "../../../proto_build/DalalMessage_pb_service";
import { Metadata } from "grpc-web-client";
import { Fragment } from "react";

import { showNotif, showErrorNotif, showInfoNotif, isPositiveInteger } from "../../utils";

const LIMIT = OrderType.LIMIT;
const MARKET = OrderType.MARKET;
const STOPLOSS = OrderType.STOPLOSS;

const orderTypeToStr = (ot: OrderType): string => {
    switch(ot) {
        case LIMIT: return "limit";
        case MARKET: return "market";
        case STOPLOSS: return "stoploss";
    }
    return "";
}

export interface PlaceOrderBoxProps{
    stockId: number,
    currentPrice: number,
    sessionMd: Metadata,
}

declare var $: any;

export class PlaceOrderBox extends React.Component<PlaceOrderBoxProps, {}> {
    constructor(props: PlaceOrderBoxProps) {
        super(props);
    }

    componentDidMount() {
        $(".place-order-box-menu .item").tab();
    }

    placeOrder = async (isAsk: boolean, orderType: OrderType, price: number, stockQuantity: number) => {
        const orderRequest = new PlaceOrderRequest();

        orderRequest.setIsAsk(isAsk);
        orderRequest.setStockId(this.props.stockId);
        orderRequest.setOrderType(orderType);
        orderRequest.setPrice(price);
        orderRequest.setStockQuantity(stockQuantity);

        try {
            const resp = await DalalActionService.placeOrder(orderRequest, this.props.sessionMd);
            showInfoNotif("Order placed successfully!", "");
            console.log(resp.getStatusCode(), resp.toObject());
        }
        catch(e) {
            // error could be grpc error or Dalal error. Both handled in exception
            console.log("Error happened! ", e.statusCode, e.statusMessage, e);
            let errorMessage = "OOPS! Something went wrong! Please notify administrator";

            if (e.isGrpcError) {
                errorMessage = "Oops! Unable to reach server. Please check your internet connection."
            } else {
                errorMessage = e.statusMessage || "Oops! Something went wrong. Please notify administrator";
            }
            showErrorNotif(errorMessage);
        }
    };

    handleOrder = async (event: any, orderType: OrderType, orderAction: string) => {
        const orderTypeString = orderTypeToStr(orderType);
        let stockInputField = document.getElementById(orderTypeString+"-"+orderAction+"-count") as HTMLInputElement;
        let priceInputField = document.getElementById(orderTypeString+"-"+orderAction+"-price") as HTMLInputElement;

        console.log(event.currentTarget);

        let stockCount = Number(stockInputField.value);
        let orderPrice = Number(orderType ==  MARKET ? 0 : priceInputField.value);

        if (!(isPositiveInteger(stockCount) && (orderType ==  MARKET || isPositiveInteger(orderPrice)))) {
            showNotif("Please enter a positive integer", "Invalid input");
            return;
        }

        console.log("Received",orderType,orderAction,"order with stockCount =", stockCount,"orderPrice =", orderPrice);

        await this.placeOrder(orderAction == "sell", orderType,  orderPrice, stockCount);
        stockInputField.value = "";
        if (priceInputField) {
            priceInputField.value = "";
        }
    };

    predictCost = (event: any, orderType: string, orderAction: string) => {
        const stockInputField = document.getElementById(orderType+"-"+orderAction+"-count") as HTMLInputElement;
        const stockCount = Number(stockInputField.value);
        const expectedCostField = document.getElementById(orderType+"-"+orderAction+"-estimation")!;
        if (isNaN(stockCount) || stockCount <= 0) {
            expectedCostField.innerHTML = "0.00";
            return;
        }
        if (orderType == "market") {
            expectedCostField.innerHTML = String(this.props.currentPrice * stockCount) + ".00";
        }
        else {
            let priceInputField = document.getElementById(orderType+"-"+orderAction+"-price") as HTMLInputElement;
            let triggerPrice = Number(priceInputField.value);
            if (isNaN(triggerPrice) || triggerPrice <= 0) {
                expectedCostField.innerHTML = "0.00";
                return;
            }
            expectedCostField.innerHTML = String(triggerPrice * stockCount) + ".00";
        }
    };

    render() {
        return (
            <Fragment>
                <div className="ui pointing secondary menu place-order-box-menu">
                    <a className="item active" data-tab="market">Market</a>
                    <a className="item" data-tab="limit">Limit</a>
                    <a className="item" data-tab="stoploss">Stoploss</a>
                    <h3 className="panel-header item right">Place Order</h3>
                </div>
                <div className="ui tab inverted active" data-tab="market">
                    <div className="ui top attached tabular menu inverted place-order-box-menu">
                        <a className="active item green" data-tab="market/buy">BUY</a>
                        <a className="item red" data-tab="market/sell">SELL</a>
                    </div>
                    <div className="ui bottom attached active tab segment inverted" data-tab="market/buy">
                        <div className="ui input">
                            <input id="market-buy-count" placeholder="Number of stocks" type="text" onChange={e => this.predictCost(e,"market","buy")}/>
                        </div>
                        <button className="ui inverted green button" onClick={e => this.handleOrder(e,  MARKET, "buy")}>BUY</button>

                        <div className="expected-cost">
                            You will lose approximately ₹ <span id="market-buy-estimation">0.00</span> in cash
                        </div>
                    </div>
                    <div className="ui bottom attached tab segment inverted" data-tab="market/sell">
                        <div className="ui input">
                            <input id="market-sell-count" placeholder="Number of stocks" type="text" onChange={e => this.predictCost(e,"market","sell")}/>
                        </div>
                        <button className="ui inverted red button" onClick={e => this.handleOrder(e, MARKET,"sell")}>SELL</button>

                        <div className="expected-cost">
                            You will gain approximately ₹ <span id="market-sell-estimation">0.00</span> in cash
                        </div>
                    </div>
                </div>
                <div className="ui tab inverted" data-tab="limit">
                    <div className="ui top attached tabular menu inverted place-order-box-menu">
                        <a className="item active green" data-tab="limit/buy">BUY</a>
                        <a className="item red" data-tab="limit/sell">SELL</a>
                    </div>
                    <div className="ui bottom attached tab segment active inverted" data-tab="limit/buy">
                        <div className="ui input">
                            <input id="limit-buy-count" placeholder="Number of stocks" type="text" onChange={e => this.predictCost(e,"limit","buy")}/>
                        </div>
                        <div className="ui input">
                            <input id="limit-buy-price" placeholder="Limit Price" type="text" onChange={e => this.predictCost(e,"limit","buy")}/>
                        </div>
                        <button className="ui inverted green button" onClick={e => this.handleOrder(e, LIMIT,"buy")}>BUY</button>

                        <div className="expected-cost">
                            You will lose atmost ₹ <span id="limit-buy-estimation">0.00</span> in cash
                        </div>
                    </div>
                    <div className="ui bottom attached tab segment inverted" data-tab="limit/sell">
                        <div className="ui input">
                            <input id="limit-sell-count" placeholder="Number of stocks" type="text" onChange={e => this.predictCost(e,"limit","sell")}/>
                        </div>
                        <div className="ui input">
                            <input id="limit-sell-price" placeholder="Limit Price" type="text" onChange={e => this.predictCost(e,"limit","sell")}/>
                        </div>
                        <button className="ui inverted red button" onClick={e => this.handleOrder(e, LIMIT,"sell")}>SELL</button>

                        <div className="expected-cost">
                            You will gain atleast ₹ <span id="limit-sell-estimation">0.00</span> in cash
                        </div>
                    </div>
                </div>
                <div className="ui tab inverted" data-tab="stoploss">
                    <div className="ui top attached tabular menu inverted place-order-box-menu">
                        <a className="item active green" data-tab="stoploss/buy">BUY</a>
                        <a className="item red" data-tab="stoploss/sell">SELL</a>
                    </div>
                    <div className="ui bottom attached tab segment active inverted" data-tab="stoploss/buy">
                        <div className="ui input">
                            <input id="stoploss-buy-count" placeholder="Number of stocks" type="text" onChange={e => this.predictCost(e,"stoploss","buy")}/>
                        </div>
                        <div className="ui input">
                            <input id="stoploss-buy-price" placeholder="Stoploss Price" type="text" onChange={e => this.predictCost(e,"stoploss","buy")}/>
                        </div>
                        <button className="ui inverted green button" onClick={e => this.handleOrder(e, STOPLOSS,"buy")}>BUY</button>

                        <div className="expected-cost">
                            You will lose approximately ₹ <span id="stoploss-buy-estimation">0.00</span> in cash
                        </div>
                    </div>
                    <div className="ui bottom attached tab segment inverted" data-tab="stoploss/sell">
                        <div className="ui input">
                            <input id="stoploss-sell-count" placeholder="Number of stocks" type="text" onChange={e => this.predictCost(e,"stoploss","sell")}/>
                        </div>
                        <div className="ui input">
                            <input id="stoploss-sell-price" placeholder="Stoploss Price" type="text" onChange={e => this.predictCost(e,"stoploss","sell")}/>
                        </div>
                        <button className="ui inverted red button" onClick={e => this.handleOrder(e, STOPLOSS,"sell")}>SELL</button>

                        <div className="expected-cost">
                            You will gain approximately ₹ <span id="stoploss-sell-estimation">0.00</span> in cash
                        </div>
                    </div>
                </div>
            </Fragment>
        );
    }
}